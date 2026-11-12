import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Arnes, pasoListo } from './bucle.arnes'
import { conMain, entorno, plan } from './bucle-flujo.arnes'

// FLUJO-8 (2026-11-12): con carriles, la puerta de fase mira el último VEREDICTO del workflow `ci` en main (ci.sh › ci_veredicto), no
// su última corrida. En main cada integración cancela la corrida anterior: el 6.14 esperó 24 min con main sano. Y un rojo de main se
// vuelve a correr una vez antes de gastar una sesión de ci-fix (los de esos días fueron del runner).
vi.setConfig({ testTimeout: 90_000 })

let a: Arnes
beforeEach(() => {
  a = conMain()
})
afterEach(() => a.limpiar())

const TODO = { PILOTO_AUTO: 'todo', PILOTO_PARADA_ESPERAS: ' ', PILOTO_PARADAS_AUTO_MAX: '0' }
const conPuerta = `  - id: "6.01"
    titulo: 'paso 6.01'
    depende_de: []
    carril: formula
    riesgo: verde
    modulos: [src/f/6.01/, docs/]
    ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno}
    verificacion: 'Nivel 1'
    terminado: 'listo'
    puerta: true
`
const corrida = (databaseId: number, status: string, conclusion: string) => ({
  databaseId,
  status,
  conclusion,
  headSha: `sha-${databaseId}`,
})

describe('bucle.sh › la puerta de fase con carriles mira el último veredicto de main', () => {
  it('con una corrida en curso y un veredicto verde detrás, abre sin esperarla', () => {
    const f = plan(conPuerta)
    a.paso(1, pasoListo({ 'src/f/6.01/a.ts': 'a' }, { paso: '6.01' }))
    const lista = JSON.stringify([
      corrida(3, 'in_progress', ''),
      corrida(2, 'completed', 'cancelled'),
      corrida(1, 'completed', 'success'),
    ])
    const r = a.correr(
      ['--una-vuelta'],
      entorno(f, { ...TODO, FAKE_GH_LISTA: lista, PILOTO_CI_ESPERA_MAX: '0' }),
    )
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('puerta de fase (6.01): el CI 1 está en verde')
    expect(a.secuencia()).toContain('publicar:6.01')
  })

  it('con una corrida en curso sobre un veredicto rojo, espera a la que corre', () => {
    const f = plan(conPuerta)
    a.paso(1, pasoListo({ 'src/f/6.01/a.ts': 'a' }, { paso: '6.01' }))
    const lista = JSON.stringify([corrida(3, 'queued', ''), corrida(1, 'completed', 'failure')])
    a.correr(
      ['--una-vuelta'],
      entorno(f, {
        ...TODO,
        FAKE_GH_LISTA: lista,
        PILOTO_CI_ESPERA_MAX: '0',
        PILOTO_PARADA_LARGA: '30',
      }),
    )
    expect(a.estado('registro.md')).toContain('el CI 3 sigue corriendo')
    expect(a.llamadas('paso')).toEqual([])
    expect(existsSync(join(a.repo, '.piloto/puertas/rerun-1'))).toBe(false)
  })

  it('un rojo de main (también el de la base) se vuelve a correr una vez; si sigue, se manda a arreglar', () => {
    const f = plan(conPuerta)
    a.paso(1, pasoListo({ 'src/f/6.01/a.ts': 'a' }, { paso: '6.01' }))
    a.correr(
      ['--una-vuelta'],
      entorno(f, {
        ...TODO,
        FAKE_GH_LISTA: JSON.stringify([corrida(7, 'completed', 'failure')]),
        FAKE_GH_JOBS: '{"jobs":[{"name":"Base · reset, tipos y probar","conclusion":"failure"}]}',
      }),
    )
    const registro = a.estado('registro.md')
    expect(registro).toContain(
      'puerta de fase (6.01): el CI 7 de main está en rojo (Base · reset, tipos y probar): vuelvo a correr lo que cayó, una vez',
    )
    expect(existsSync(join(a.repo, '.piloto/puertas/rerun-7'))).toBe(true)
    // La corrida falsa sigue roja: la segunda vez ya no se vuelve a correr, va el ci-fix.
    expect(registro).toContain(
      'puerta de fase (6.01): el CI 7 de main está en rojo (Base · reset, tipos y probar): se arregla antes de seguir',
    )
    expect(existsSync(join(a.repo, '.piloto/puertas/6.01'))).toBe(false)
  })
})
