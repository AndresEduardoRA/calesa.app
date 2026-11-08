import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Arnes, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'
import {
  conMain,
  coordinador,
  dirCoord,
  entorno,
  estadoCoord,
  paso,
  pasoEspera,
  pasoSinCambios,
  plan,
} from './bucle-flujo.arnes'

// Lo que encontró la revisión adversarial de FLUJO-1 antes de integrar: un pedido o un paso que cierra sin cambios no se repite sin fin, un
// fallo del modelo va directo a la persona, la espera pide sus archivos y tiene tope, y dos carriles que se esperan son un ciclo.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = conMain()
})
afterEach(() => a.limpiar())

describe('bucle.sh › revisión de FLUJO-1: pedidos y pasos que cierran sin cambios, fallas', () => {
  it('un pedido que termina «listo sin cambios» se cierra en el coordinador: no se vuelve a dar sin fin', () => {
    const f = plan(paso('4.99'), paso('4.97', 'papelera'))
    coordinador(f, 'pedir', 'papelera', '4.97', 'el registro de formula', 'src/f/registro.ts')
    a.paso(1, pasoSinCambios('pedido-1'))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('ruteo')).toEqual([]) // el ruteo de un pedido lo escribe el bucle
    expect(a.llamadas('paso')[0]).toContain('/piloto pedido-1')
    expect(estadoCoord().pedidos?.[0]).toMatchObject({
      id: 'pedido-1',
      estado: 'integrado',
      sin_cambios: true,
    })
    // La vuelta siguiente ya no lo vuelve a dar: toma su paso.
    a.paso(2, pasoListo({ 'src/f/a.ts': 'a' }))
    a.correr(['--una-vuelta'], entorno(f))
    expect(a.llamadas('paso')[1]).toContain('/piloto 4.99')
  })

  it('un paso del plan que dice «listo» sin cambios y sigue asignado va a la persona', () => {
    const f = plan(paso('4.99'))
    a.paso(1, pasoSinCambios('4.99'))
    a.decidir(1, responder('parado'))
    const r = a.correr([], entorno(f, { PILOTO_AUTO: 'parada' }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.leerFake('compuerta-1.md')).toContain('el coordinador lo sigue teniendo asignado')
    expect(a.estado('registro.md')).not.toContain('reintento solo')
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('sin cambios, asignado y con su PR abierto (volvió por un falso rojo): vuelve a publicado sin preguntar, una vez', () => {
    const f = plan(paso('4.99'))
    coordinador(f, 'siguiente', 'formula')
    coordinador(f, 'publicado', '4.99', '5')
    coordinador(f, 'siguiente', 'formula') // nada propio: espera (publicado)
    const est = estadoCoord()
    const vuelto = { ...est.pasos['4.99'], estado: 'asignado', arreglar: 'CI en rojo' }
    writeFileSync(
      join(dirCoord(), 'estado.json'),
      JSON.stringify({ ...est, pasos: { ...est.pasos, '4.99': vuelto } }),
    )
    a.paso(1, pasoSinCambios('4.99'))
    const r = a.correr(['--una-vuelta'], entorno(f, { PILOTO_AUTO: 'parada' }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().filter((l) => l.startsWith('decidir:'))).toEqual([])
    expect(a.estado('registro.md')).toContain('su PR #5 sigue abierto; vuelve a publicado')
    expect(estadoCoord().pasos['4.99']).toMatchObject({ estado: 'publicado', pr: 5 })
  })

  it('un paso que falla va directo a la persona, aunque los avisos se reintenten solos', () => {
    a.paso(
      1,
      `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"4.99","resultado":"falla","resumen":"no pude","commits":[],"e2e_dirigidos":[],"compuerta":null}
EOF`,
    )
    a.decidir(1, responder('parado'))
    const r = a.correr([], { PILOTO_AUTO: 'parada' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).not.toContain('reintento solo')
    expect(a.leerFake('compuerta-1.md')).toContain('terminó en falla')
  })
})

describe('bucle.sh › revisión de FLUJO-1: esperas, fallas y ciclos', () => {
  it('una «espera» sin archivos no vale: el paso tiene que nombrar lo que necesita', () => {
    a.paso(
      1,
      `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"4.99","resultado":"compuerta","resumen":"x","commits":[],"e2e_dirigidos":[],"compuerta":{"tipo":"espera","pedido":"algo"}}
EOF`,
    )
    a.paso(2, 'true')
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.leerFake('compuerta-1.md')).toContain('falló dos veces')
  })

  it('la cuarta espera del mismo paso va a la persona', () => {
    const f = plan(paso('4.99'))
    mkdirSync(join(a.repo, '.piloto/paradas-solas'), { recursive: true })
    writeFileSync(join(a.repo, '.piloto/paradas-solas/espera-4.99'), '3\n')
    a.paso(1, pasoEspera(['src/p/registro.ts']))
    a.decidir(1, responder('parado'))
    const r = a.correr([], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.leerFake('compuerta-1.md')).toContain('pidió esperar a main 4 veces')
  })

  it('dos carriles que se esperan: el ciclo va a la persona en vez de esperar 6 h', () => {
    const f = plan(paso('4.99'), paso('4.97', 'papelera'))
    // formula ya espera algo de papelera (su pedido-1)…
    coordinador(f, 'pedir', 'formula', '4.99', 'algo de papelera', 'src/p/a.ts')
    // …y papelera, a mitad de su 4.97 (retomado: no pasa por el coordinador), pide algo de formula.
    a.git('checkout', '-q', '-b', 'papelera/4.97')
    mkdirSync(join(a.repo, '.piloto'), { recursive: true })
    writeFileSync(
      join(a.repo, '.piloto/en-curso.json'),
      JSON.stringify({
        paso: '4.97',
        session_id: 's',
        pid: null,
        head_arranque: a.git('rev-parse', 'HEAD'),
        estado: 'compuerta',
        modelo: 'sonnet',
        effort: 'high',
      }),
    )
    a.ruteo({ ...RUTEO_BASE, paso: '4.97' })
    a.paso(1, pasoEspera(['src/f/registro.ts']).replace('"paso":"4.99"', '"paso":"4.97"'))
    a.decidir(1, responder('parado'))
    const r = a.correr([], { ...entorno(f), PILOTO_CARRIL: 'papelera' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.leerFake('compuerta-1.md')).toContain('ciclo: el carril formula espera al papelera')
  })

  it('se despierta cuando el dueño cierra el pedido, aunque main no cambie', () => {
    const f = plan(paso('4.99'))
    const cerrar = join(a.raiz, 'dormir-cierra')
    writeFileSync(
      cerrar,
      `#!/usr/bin/env bash
[ -e "${cerrar}.hecho" ] && exit 0; touch "${cerrar}.hecho"
cd "${a.repo}" && COORD_PLAN="${f}" COORD_DIR="${dirCoord()}" node "${resolve('scripts/coordinador/coordinador.mjs')}" siguiente papelera >/dev/null &&
  COORD_PLAN="${f}" COORD_DIR="${dirCoord()}" node "${resolve('scripts/coordinador/coordinador.mjs')}" cerrar-pedido pedido-1 ya estaba >/dev/null
`,
    )
    chmodSync(cerrar, 0o755)
    a.paso(1, pasoEspera(['src/p/registro.ts']))
    a.paso(2, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'], entorno(f, { PILOTO_DORMIR: cerrar }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('retomo el paso')
    expect(a.llamadas('paso')).toHaveLength(2)
  })
})
