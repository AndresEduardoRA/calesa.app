import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Arnes, pasoFalla, pasoListo } from './bucle.arnes'
import {
  conMain,
  coordinador,
  dirCoord,
  entorno,
  estadoCoord,
  GIT,
  integrarEnMain,
  plan,
} from './bucle-flujo.arnes'

// De corrido (2026-11-09: las fases 5 a 9 sin nadie mirando). Con carriles y sin compuertas, nada deja un carril parado esperando a una
// persona que no va a venir: el paso que no cierra se aparca y el carril toma otro; lo del entorno se espera y se reintenta; la puerta de
// fase sale del plan y no del número del paso; y un carril que espera dice por qué, una vez.
vi.setConfig({ testTimeout: 90_000 })

let a: Arnes
beforeEach(() => {
  a = conMain()
})
afterEach(() => a.limpiar())

// Sin reintentos solos (un espacio: vacío vale por los de omisión) ni respuestas automáticas previas: el aviso llega agotado.
const TODO = { PILOTO_AUTO: 'todo', PILOTO_PARADA_ESPERAS: ' ', PILOTO_PARADAS_AUTO_MAX: '0' }
const pasoDelPlan = (
  id: string,
  extra = '',
  depende: string[] = [],
  carril = 'formula',
) => `  - id: "${id}"
    titulo: 'paso ${id}'
    depende_de: [${depende.map((d) => `"${d}"`).join(', ')}]
    carril: ${carril}
    riesgo: verde
    modulos: [src/${carril === 'formula' ? 'f' : 'p'}/${id}/, docs/]
    ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno}
    verificacion: 'Nivel 1'
    terminado: 'listo'
${extra}`
const compuertaCon = (paso: string, tipo: string, primera: string) =>
  `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"${paso}","resultado":"compuerta","resumen":"pregunta","commits":[],"e2e_dirigidos":[],"compuerta":{"tipo":"${tipo}","motivo":"falta la clave del proveedor","pregunta":"¿Sigo?","opciones":[{"etiqueta":"${primera}","descripcion":"la recomendada"},{"etiqueta":"otra","descripcion":"la otra"}]}}
EOF`
const sinDecidir = () => a.secuencia().filter((l) => l.startsWith('decidir:'))

describe('bucle.sh › un paso que no cierra se aparca y el carril sigue', () => {
  it('una falla agotada aparca el paso en el coordinador, deja su nota y la vuelta siguiente toma otro paso', () => {
    const f = plan(pasoDelPlan('5.01'), pasoDelPlan('5.02'))
    a.paso(1, `echo a-medias > sin-commitear.txt\n${pasoFalla('5.01')}`)
    const r1 = a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(r1.estado, r1.salida).toBe(0)
    const registro = a.estado('registro.md')
    expect(registro).toContain('APARCADO 5.01: el paso 5.01 terminó en falla')
    expect(registro).not.toContain('parado (decisión automática')
    expect(sinDecidir()).toEqual([])
    expect(estadoCoord().pasos['5.01']).toMatchObject({ estado: 'aparcado', aparcado_veces: 1 })
    expect(a.estado('en-curso.json')).toBe('')
    expect(a.estado('asignado.json')).toBe('')
    // Lo que quedó sin commitear no se pierde ni ensucia el paso siguiente: va a un stash con nombre, y la nota lo dice.
    expect(a.git('status', '--porcelain')).toBe('')
    expect(a.git('stash', 'list')).toContain('piloto: 5.01 aparcado')
    expect(a.estado('aparcados/5.01.md')).toMatch(
      /Motivo, literal: el paso 5\.01 terminó en falla[\s\S]*stash «piloto: 5\.01 aparcado/,
    )

    a.paso(2, pasoListo({ 'src/f/5.02/a.ts': 'a' }, { paso: '5.02' }))
    const r2 = a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(r2.estado, r2.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('el coordinador asignó 5.02')
    expect(a.secuencia()).toContain('publicar:5.02')
  })

  it('sin nada más que hacer, el carril reintenta lo aparcado con una sesión nueva; al cerrarlo, su nota se borra', () => {
    const f = plan(pasoDelPlan('5.01'))
    a.paso(1, pasoFalla('5.01'))
    a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(estadoCoord().pasos['5.01']?.estado).toBe('aparcado')

    // Recién aparcado, se enfría: el carril espera y dice por qué.
    const r2 = a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(r2.estado, r2.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('sin paso libre (lo que le queda está aparcado')
    expect(a.llamadas('paso')).toHaveLength(1)

    a.paso(2, pasoListo({ 'src/f/5.01/a.ts': 'a' }, { paso: '5.01' }))
    const r3 = a.correr(['--una-vuelta'], entorno(f, { ...TODO, COORD_APARCADO_ENFRIAR: '0' }))
    expect(r3.estado, r3.salida).toBe(0)
    expect(a.llamadas('paso')[1]).toContain('--session-id')
    expect(a.llamadas('paso')[1]).not.toContain('--resume')
    expect(a.secuencia()).toContain('publicar:5.01')
    expect(existsSync(join(a.repo, '.piloto/aparcados/5.01.md'))).toBe(false)
  })

  it('pasados los reintentos, lo aparcado queda para la persona y el carril espera sin gastar sesiones', () => {
    const f = plan(pasoDelPlan('5.01'))
    const e = entorno(f, { ...TODO, COORD_APARCADO_ENFRIAR: '0', COORD_APARCADOS_MAX: '1' })
    a.paso(1, pasoFalla('5.01'))
    a.paso(2, pasoFalla('5.01'))
    a.correr(['--una-vuelta'], e)
    a.correr(['--una-vuelta'], e)
    expect(estadoCoord().pasos['5.01']).toMatchObject({ estado: 'aparcado', aparcado_veces: 2 })
    const r = a.correr(['--una-vuelta'], e)
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(2)
    expect(a.estado('registro.md')).toContain('sin paso libre (atascado: 5.01 está aparcado')
    // La persona lo devuelve a la cola.
    coordinador(f, 'reanudar', '5.01')
    expect(estadoCoord().pasos['5.01']).toMatchObject({ estado: 'pendiente', aparcado_veces: 0 })
  })

  it('una compuerta cuya recomendada es parar (falta algo de afuera) aparca el paso en vez de parar el carril', () => {
    const f = plan(pasoDelPlan('5.01'))
    a.paso(1, compuertaCon('5.01', 'hito', 'parar'))
    const r = a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(r.estado, r.salida).toBe(0)
    expect(sinDecidir()).toEqual([])
    expect(a.estado('registro.md')).toContain(
      'APARCADO 5.01: compuerta hito sin salida: falta la clave del proveedor',
    )
    expect(estadoCoord().pasos['5.01']?.estado).toBe('aparcado')
  })

  it('con «todo», ninguna compuerta abre la sesión de decidir: una «hito» con opciones se contesta con la primera', () => {
    const f = plan(pasoDelPlan('5.01'))
    a.paso(1, compuertaCon('5.01', 'hito', 'seguir'))
    a.paso(2, pasoListo({ 'src/f/5.01/a.ts': 'a' }, { paso: '5.01' }))
    const e = entorno(f, TODO)
    a.correr(['--una-vuelta'], e)
    const r = a.correr(['--una-vuelta'], e)
    expect(r.estado, r.salida).toBe(0)
    expect(sinDecidir()).toEqual([])
    expect(a.llamadas('paso')[1]).toContain('--resume')
    expect(a.secuencia()).toContain('publicar:5.01')
  })
})

describe('bucle.sh › lo del entorno se espera y se reintenta, sin parar el carril', () => {
  it('un aviso sin paso (el disco) agota sus respuestas, duerme PILOTO_PARADA_LARGA y la vuelta se repite', () => {
    const f = plan(pasoDelPlan('5.01'))
    const r = a.correr(
      ['--una-vuelta'],
      entorno(f, { ...TODO, PILOTO_DISCO_MAX: '1', PILOTO_PARADA_LARGA: '90' }),
    )
    expect(r.estado, r.salida).toBe(0)
    const registro = a.estado('registro.md')
    expect(registro).toContain('sin salida por ahora (el disco está al')
    expect(registro).not.toContain('parado (decisión automática')
    expect(
      a
        .lineas('dormir.log')
        .map(Number)
        .reduce((s, n) => s + n, 0),
    ).toBe(90)
    // No llegó a pedir paso: nada quedó aparcado.
    expect(a.estado('aparcados/5.01.md')).toBe('')
  })

  it('sin carril, «todo» sigue parando como antes (no hay otro paso que tomar)', () => {
    const r = a.correr([], { ...TODO, PILOTO_DISCO_MAX: '1' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('parado (decisión automática')
  })
})

describe('bucle.sh › la puerta de fase sale del plan', () => {
  const CI_VERDE = '[{"databaseId":1,"status":"completed","conclusion":"success","headSha":"x"}]'
  const CI_CURSO = '[{"databaseId":3,"status":"in_progress","conclusion":null,"headSha":"x"}]'

  it('un paso con `puerta: true` espera el CI de main en verde antes de empezar, una sola vez', () => {
    const f = plan(pasoDelPlan('6.01', '    puerta: true\n'))
    a.paso(1, pasoListo({ 'src/f/6.01/a.ts': 'a' }, { paso: '6.01' }))
    const r = a.correr(['--una-vuelta'], entorno(f, { ...TODO, FAKE_GH_LISTA: CI_VERDE }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('puerta de fase (6.01): el CI 1 está en verde')
    expect(existsSync(join(a.repo, '.piloto/puertas/6.01'))).toBe(true)
    expect(a.secuencia()).toContain('publicar:6.01')
  })

  it('con el CI de main todavía corriendo, el paso con puerta no empieza', () => {
    const f = plan(pasoDelPlan('6.01', '    puerta: true\n'))
    a.paso(1, pasoListo({ 'src/f/6.01/a.ts': 'a' }, { paso: '6.01' }))
    a.correr(
      ['--una-vuelta'],
      entorno(f, {
        ...TODO,
        FAKE_GH_LISTA: CI_CURSO,
        PILOTO_CI_ESPERA_MAX: '0',
        PILOTO_PARADA_LARGA: '30',
      }),
    )
    expect(a.llamadas('paso')).toEqual([])
    expect(existsSync(join(a.repo, '.piloto/puertas/6.01'))).toBe(false)
  })

  it('un paso sin `puerta` no mira el CI aunque esté corriendo', () => {
    const f = plan(pasoDelPlan('6.02'))
    a.paso(1, pasoListo({ 'src/f/6.02/a.ts': 'a' }, { paso: '6.02' }))
    const r = a.correr(['--una-vuelta'], entorno(f, { ...TODO, FAKE_GH_LISTA: CI_CURSO }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).not.toContain('puerta de fase')
    expect(a.secuencia()).toContain('publicar:6.02')
  })
})

describe('bucle.sh › un carril que espera dice por qué, una vez', () => {
  it('«sin paso libre» lleva el motivo del coordinador y no se repite en cada vuelta', () => {
    const f = plan(pasoDelPlan('5.01', '', [], 'papelera'), pasoDelPlan('5.02', '', ['5.01']))
    const e = entorno(f, TODO)
    a.correr(['--una-vuelta'], e)
    a.correr(['--una-vuelta'], e)
    a.correr(['--una-vuelta'], e)
    const lineas = a
      .estado('registro.md')
      .split('\n')
      .filter((l) => l.includes('sin paso libre'))
    expect(lineas).toHaveLength(1)
    expect(lineas[0]).toContain('sin paso libre (5.02 espera a que se integren: 5.01)')
    expect(a.lineas('dormir.log')).toEqual(['120', '120', '120'])
  })
})

describe('bucle.sh › sin compuertas, el plan de un paso de datos no espera a nadie', () => {
  it('con «datos» contestado solo, el paso no corre con --hasta-plan', () => {
    const f = plan(pasoDelPlan('5.01'))
    a.ruteo({
      paso: '5.01',
      titulo: 't',
      modelo: 'opus',
      effort: 'high',
      sesion: { tipo: 'nueva', session_id: null },
      nivel: { nivel: 1, disparadores: [], cuenta_e2e: 0, completo: false },
      compuerta: { tipo: 'datos', motivo: 'toca RLS' },
      particion: '',
      por_que: 'prueba',
    })
    a.paso(1, pasoListo({ 'src/f/5.01/a.ts': 'a' }, { paso: '5.01' }))
    const r = a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')[0]).not.toContain('--hasta-plan')
    expect(readFileSync(join(a.repo, '.piloto/registro.md'), 'utf8')).toContain('publicado 5.01')
  })
})

// Con tres carriles creando tablas y RPC a la vez, dos ramas chocan en el archivo de tipos aunque sus migraciones no se toquen.
describe('carril.sh › lo generado no se une a mano', () => {
  const TIPOS = 'src/shared/types/database.types.ts'
  const devueltoConChoqueEnTipos = (f: string) => {
    integrarEnMain(TIPOS, 'export type Tablas = { a: 1 }\n')
    coordinador(f, 'siguiente', 'formula')
    coordinador(f, 'publicado', '5.01', '7')
    a.git('fetch', '-q', 'origin')
    a.git('checkout', '-q', '-b', 'formula/5.01', 'origin/main')
    a.escribirRepo(TIPOS, 'export type Tablas = { a: 1; de_la_rama: 2 }\n')
    a.escribirRepo('src/f/5.01/a.ts', 'de la rama\n')
    a.git('add', '.')
    a.git(...GIT, 'commit', '-q', '-m', 'el paso')
    a.git('push', '-q', 'origin', 'formula/5.01')
    a.git('checkout', '-q', '--detach')
    const archivo = `${dirCoord()}/estado.json`
    const estado = JSON.parse(readFileSync(archivo, 'utf8'))
    estado.pasos['5.01'].arreglar = 'conflicto con main'
    writeFileSync(archivo, JSON.stringify(estado))
    integrarEnMain(TIPOS, 'export type Tablas = { a: 1; de_main: 3 }\n')
  }

  it('un choque sólo en database.types.ts se resuelve regenerándolo y el PR se publica sin sesión', () => {
    const f = plan(pasoDelPlan('5.01'))
    devueltoConChoqueEnTipos(f)
    const regenerar = `printf 'export type Tablas = { a: 1; de_la_rama: 2; de_main: 3 }\\n' > ${TIPOS}`
    const r = a.correr(['--una-vuelta'], entorno(f, { ...TODO, PILOTO_CMD_TIPOS: regenerar }))
    expect(r.estado, r.salida).toBe(0)
    const registro = a.estado('registro.md')
    expect(registro).toContain('regeneré los tipos de la base tras traer main')
    expect(registro).toContain('5.01 remendado sin sesión (conflicto con main)')
    expect(a.llamadas('paso')).toHaveLength(0)
    expect(readFileSync(join(a.repo, TIPOS), 'utf8')).toContain('de_la_rama: 2; de_main: 3')
    expect(a.git('log', '-1', '--format=%s')).toBe('chore(db): regenerar los tipos tras traer main')
    expect(a.git('status', '--porcelain')).toBe('')
  })

  it('si regenerar falla, no se publica sin sesión: lo resuelve el paso', () => {
    const f = plan(pasoDelPlan('5.01'))
    devueltoConChoqueEnTipos(f)
    a.paso(1, pasoListo({ 'src/f/5.01/b.ts': 'b' }, { paso: '5.01' }))
    const r = a.correr(['--una-vuelta'], entorno(f, { ...TODO, PILOTO_CMD_TIPOS: 'exit 1' }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('no pude regenerar los tipos de la base')
    expect(a.estado('registro.md')).not.toContain('remendado sin sesión')
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})
