import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Arnes, pasoFalla, pasoListo } from './bucle.arnes'
import { conMain, entorno, estadoCoord, GIT, plan } from './bucle-flujo.arnes'

// Lo que encontró la revisión de FLUJO-2 (2026-11-09) antes de dejar correr los carriles sin nadie: aparcar no puede dejar el árbol
// sucio (el carril quedaba dormido para siempre), una falla común a todos los pasos no puede aparcar el plan entero, y un paso que ni
// siquiera puede empezar no puede retener al carril.
vi.setConfig({ testTimeout: 90_000 })

let a: Arnes
beforeEach(() => {
  a = conMain()
})
afterEach(() => a.limpiar())

const TODO = { PILOTO_AUTO: 'todo', PILOTO_PARADA_ESPERAS: ' ', PILOTO_PARADAS_AUTO_MAX: '0' }
const pasoDelPlan = (id: string, extra = '') => `  - id: "${id}"
    titulo: 'paso ${id}'
    depende_de: []
    carril: formula
    riesgo: verde
    modulos: [src/f/${id}/, docs/]
    ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno}
    verificacion: 'Nivel 1'
    terminado: 'listo'
${extra}`
const dormido = () =>
  a
    .lineas('dormir.log')
    .map(Number)
    .reduce((s, n) => s + n, 0)

describe('corrido.sh › aparcar deja el árbol limpio sin perder nada', () => {
  it('con un merge a medias (archivos sin unir) lo aborta, guarda lo demás y aparca: la vuelta siguiente toma otro paso', () => {
    const f = plan(pasoDelPlan('5.01'), pasoDelPlan('5.02'))
    // La sesión deja un choque sin resolver y un archivo nuevo, y dice que no puede.
    const choque = [
      `git ${GIT.join(' ')} checkout -q -b otra`,
      `echo de-otra > choca.txt && git add choca.txt && git ${GIT.join(' ')} commit -q -m otra`,
      'git checkout -q -',
      `echo de-aqui > choca.txt && git add choca.txt && git ${GIT.join(' ')} commit -q -m aqui`,
      `git ${GIT.join(' ')} merge -q otra >/dev/null 2>&1 || true`,
      'echo nuevo > sin-rastrear.txt',
    ].join('\n')
    a.paso(1, `${choque}\n${pasoFalla('5.01')}`)
    const r1 = a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(r1.estado, r1.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('APARCADO 5.01')
    expect(a.git('status', '--porcelain')).toBe('')
    expect(existsSync(join(a.repo, '.git/MERGE_HEAD'))).toBe(false)
    expect(a.git('stash', 'list')).toContain('piloto: 5.01 aparcado')
    expect(estadoCoord().pasos['5.01']?.estado).toBe('aparcado')

    a.paso(2, pasoListo({ 'src/f/5.02/a.ts': 'a' }, { paso: '5.02' }))
    const r2 = a.correr(['--una-vuelta'], entorno(f, TODO))
    expect(r2.estado, r2.salida).toBe(0)
    expect(a.secuencia()).toContain('publicar:5.02')
  })
})

describe('corrido.sh › el disyuntor: una falla de todos no aparca el plan entero', () => {
  it('tras PILOTO_APARCADOS_SEGUIDOS pasos aparcados sin publicar ninguno, el siguiente no se aparca: espera y se reintenta', () => {
    const f = plan(pasoDelPlan('5.01'), pasoDelPlan('5.02'), pasoDelPlan('5.03'))
    const e = entorno(f, { ...TODO, PILOTO_APARCADOS_SEGUIDOS: '2', PILOTO_PARADA_LARGA: '60' })
    a.paso(1, pasoFalla('5.01'))
    a.paso(2, pasoFalla('5.02'))
    a.paso(3, pasoFalla('5.03'))
    a.correr(['--una-vuelta'], e)
    a.correr(['--una-vuelta'], e)
    expect(Object.values(estadoCoord().pasos).filter((p) => p.estado === 'aparcado')).toHaveLength(
      2,
    )
    const antes = dormido()
    const r = a.correr(['--una-vuelta'], e)
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('DISYUNTOR: 2 pasos aparcados seguidos')
    expect(estadoCoord().pasos['5.03']?.estado).toBe('asignado')
    expect(a.estado('en-curso.json')).toContain('"paso":"5.03"')
    expect(dormido() - antes).toBe(60)
  })

  it('un paso publicado vuelve la cuenta a cero', () => {
    const f = plan(pasoDelPlan('5.01'), pasoDelPlan('5.02'), pasoDelPlan('5.03'))
    const e = entorno(f, { ...TODO, PILOTO_APARCADOS_SEGUIDOS: '2' })
    a.paso(1, pasoFalla('5.01'))
    a.paso(2, pasoListo({ 'src/f/5.02/a.ts': 'a' }, { paso: '5.02' }))
    a.correr(['--una-vuelta'], e)
    expect(a.estado('aparcados-seguidos').trim()).toBe('1')
    a.correr(['--una-vuelta'], e)
    expect(a.secuencia()).toContain('publicar:5.02')
    expect(a.estado('aparcados-seguidos')).toBe('')
  })
})

describe('corrido.sh › un paso que no puede ni empezar no retiene al carril', () => {
  const CI_CURSO = '[{"databaseId":3,"status":"in_progress","conclusion":null,"headSha":"x"}]'

  it('la puerta de fase que no abre (el CI de main no termina) aparca el paso tras PILOTO_ESPERAS_SIN_EMPEZAR esperas', () => {
    const f = plan(pasoDelPlan('6.14', '    puerta: true\n'))
    const e = entorno(f, {
      ...TODO,
      FAKE_GH_LISTA: CI_CURSO,
      PILOTO_CI_ESPERA_MAX: '0',
      PILOTO_PARADA_LARGA: '30',
      PILOTO_ESPERAS_SIN_EMPEZAR: '2',
    })
    a.correr(['--una-vuelta'], e)
    expect(a.estado('registro.md')).toContain('sin salida por ahora')
    expect(a.llamadas('paso')).toEqual([])
    const r = a.correr(['--una-vuelta'], e)
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('APARCADO 6.14: el CI 3 sigue corriendo')
    expect(estadoCoord().pasos['6.14']?.estado).toBe('aparcado')
    expect(a.llamadas('paso')).toEqual([])
  })
})

describe('corrido.sh › sólo una llamada que falló se toma por límite o por corte de red', () => {
  it('un paso que termina bien y cuyo texto nombra un límite o un «fetch failed» no duerme', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }), {
      salida: {
        type: 'result',
        is_error: false,
        result:
          "El plan cubre «You've hit your session limit · resets 3:45pm» y un test con fetch failed.",
        session_id: 'fake',
        total_cost_usd: 0.5,
      },
    })
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.lineas('dormir.log')).toEqual([])
    expect(a.secuencia()).toContain('publicar:4.99')
  })

  it('pasadas PILOTO_RED_VECES esperas seguidas, la red caída vuelve a ser una falla del paso', () => {
    const sinRed = {
      type: 'result',
      is_error: true,
      result: "API Error: Can't reach the API server (EAI_AGAIN)",
      session_id: 'fake',
    }
    for (const n of [1, 2, 3, 4]) a.paso(n, 'true', { salida: sinRed, salida_codigo: 1 })
    a.decidir(
      1,
      `sleep 0.3\nprintf 'id: %s\\nopcion: parado\\nme respondió: «parado»\\n' "$ID" > "$COMUN/decision.md"`,
    )
    a.correr([], { PILOTO_RED_VECES: '2' })
    expect(a.lineas('dormir.log')).toEqual(['300', '600'])
    expect(a.estado('registro.md')).toContain('falló dos veces')
  })
})
