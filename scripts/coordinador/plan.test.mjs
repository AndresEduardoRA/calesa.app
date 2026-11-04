import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  caminoCritico,
  desfases,
  estadoInicial,
  fraccionDeCuota,
  integraSolo,
  leerConsumo,
  leerPlan,
  marcar,
  ordenTopologico,
  problemasDelPlan,
  siguiente,
  tablero,
} from './plan.mjs'

const ruteo = (extra = {}) => ({
  agente: 'claude',
  modelo: 'sonnet',
  effort: 'high',
  modo: 'auto',
  sesion: 'nueva',
  revisor: 'ninguno',
  ...extra,
})
const rojo = ruteo({
  modelo: 'opus',
  effort: 'xhigh',
  modo: 'plan→manual',
  revisor: 'claude-sesion-nueva',
})
const paso = (id, carril, depende_de, modulos, riesgo = 'verde', r = ruteo()) => ({
  id,
  titulo: `t ${id}`,
  depende_de,
  carril,
  riesgo,
  modulos,
  ruteo: riesgo === 'rojo' ? rojo : r,
  verificacion: { nivel: 1, comando: 'pnpm test' },
  terminado: 'verde',
})

// datos: P01 → (P02 datos, P03 ui, P04 ui) ; P05 ui depende de P02 y P04
const PLAN = {
  esquema: 'plan/v1',
  agentes_disponibles: ['claude'],
  carriles: [
    { id: 'datos', dueno_de: ['supabase/', 'src/modules/x/infra/'] },
    { id: 'ui', dueno_de: ['src/modules/x/features/', 'src/app/'] },
  ],
  pasos: [
    paso('P01', 'datos', [], ['supabase/migrations/'], 'rojo'),
    paso('P02', 'datos', ['P01'], ['src/modules/x/infra/'], 'ambar'),
    paso('P03', 'ui', ['P01'], ['src/app/'], 'verde'),
    paso('P04', 'ui', ['P03'], ['src/modules/x/features/lista/'], 'verde'),
    paso('P05', 'ui', ['P02', 'P04'], ['src/modules/x/features/detalle/'], 'ambar'),
  ],
}

test('un plan bien hecho no tiene problemas', () => {
  assert.deepEqual(problemasDelPlan(PLAN), [])
})

test('detecta OWNERS solapados, módulos ajenos, ciclos, pasos paralelos sobre lo mismo y rojos mal ruteados', () => {
  const malo = structuredClone(PLAN)
  malo.carriles[1].dueno_de.push('supabase/functions/')
  malo.pasos[2].modulos = ['src/modules/x/infra/']
  malo.pasos[0].depende_de = ['P02']
  malo.pasos[0].ruteo = ruteo()
  const p = problemasDelPlan(malo).join('\n')
  assert.match(p, /OWNERS: datos y ui comparten/)
  assert.match(p, /P03: toca src\/modules\/x\/infra\/, que no es del carril ui/)
  assert.match(p, /ciclo/)
  assert.match(p, /P01: un paso rojo va con opus/)

  const paralelo = structuredClone(PLAN)
  paralelo.pasos[3].depende_de = ['P01']
  paralelo.pasos[3].modulos = ['src/app/']
  assert.match(
    problemasDelPlan(paralelo).join('\n'),
    /P03 y P04 pueden correr a la vez y los dos tocan src\/app\//,
  )
})

test('codex sólo si está disponible', () => {
  const p = structuredClone(PLAN)
  p.pasos[2].ruteo = ruteo({ agente: 'codex', modelo: 'codex' })
  assert.match(problemasDelPlan(p).join('\n'), /P03: usa codex, que no está disponible/)
  p.agentes_disponibles = ['claude', 'codex']
  assert.deepEqual(problemasDelPlan(p), [])
})

test('orden topológico y camino crítico', () => {
  assert.deepEqual(ordenTopologico(PLAN), ['P01', 'P02', 'P03', 'P04', 'P05'])
  const largo = caminoCritico(PLAN)
  assert.equal(largo.get('P01'), 4) // P01 → P03 → P04 → P05
  assert.equal(largo.get('P02'), 2)
  assert.equal(largo.get('P03'), 3)
})

test('al principio sólo arranca P01; el otro carril espera', () => {
  const e = estadoInicial(PLAN)
  const r = siguiente(PLAN, e, 'datos')
  assert.equal(r.accion, 'paso')
  assert.equal(r.paso.id, 'P01')
  assert.equal(r.rama, 'datos/p01')
  assert.deepEqual(siguiente(PLAN, e, 'ui'), {
    accion: 'esperar',
    motivo: 'P03 espera a que se integren: P01',
  })
})

test('integrado P01, los dos carriles trabajan a la vez', () => {
  let e = estadoInicial(PLAN)
  e = marcar(e, 'P01', 'asignado')
  e = marcar(e, 'P01', 'publicado', { pr: 7 })
  assert.equal(siguiente(PLAN, e, 'ui').accion, 'esperar') // publicado no basta: falta integrar
  e = marcar(e, 'P01', 'integrado')
  assert.equal(siguiente(PLAN, e, 'datos').paso.id, 'P02')
  assert.equal(siguiente(PLAN, e, 'ui').paso.id, 'P03')
})

test('un carril con un paso asignado lo retoma, no toma otro', () => {
  let e = estadoInicial(PLAN)
  e = marcar(e, 'P01', 'asignado')
  const r = siguiente(PLAN, e, 'datos')
  assert.equal(r.paso.id, 'P01')
  assert.equal(r.retomar, true)
})

test('un PR propio en rojo vuelve antes que un paso nuevo', () => {
  let e = estadoInicial(PLAN)
  for (const id of ['P01'])
    e = marcar(marcar(marcar(e, id, 'asignado'), id, 'publicado', { pr: 1 }), id, 'integrado')
  e = marcar(marcar(e, 'P03', 'asignado'), 'P03', 'publicado', { pr: 3 })
  e.pasos.P03.arreglar = 'CI en rojo'
  const r = siguiente(PLAN, e, 'ui')
  assert.equal(r.paso.id, 'P03')
  assert.equal(r.arreglar, 'CI en rojo')
})

test('con la cuota sobre el umbral sólo avanza el camino crítico; en el tope, nadie', () => {
  let e = estadoInicial(PLAN)
  e = marcar(
    marcar(marcar(e, 'P01', 'asignado'), 'P01', 'publicado', { pr: 1 }),
    'P01',
    'integrado',
  )
  // Quedan P02 (largo 2), P03 (3), P04 (2), P05 (1): el crítico es P03.
  assert.equal(siguiente(PLAN, e, 'ui', { cuota: 0.85 }).paso.id, 'P03')
  assert.match(siguiente(PLAN, e, 'datos', { cuota: 0.85 }).motivo, /camino crítico/)
  assert.match(siguiente(PLAN, e, 'ui', { cuota: 1 }).motivo, /tope/)
  assert.equal(siguiente(PLAN, e, 'datos', { cuota: null }).paso.id, 'P02')
})

test('terminado cuando todos los pasos del carril están integrados', () => {
  let e = estadoInicial(PLAN)
  for (const id of ['P01', 'P02'])
    e = marcar(marcar(marcar(e, id, 'asignado'), id, 'publicado', { pr: 1 }), id, 'integrado')
  assert.deepEqual(siguiente(PLAN, e, 'datos'), { accion: 'terminado' })
})

test('transiciones inválidas fallan', () => {
  const e = estadoInicial(PLAN)
  assert.throws(() => marcar(e, 'P01', 'integrado'), /no puede pasar de pendiente a integrado/)
  assert.throws(() => marcar(e, 'P99', 'asignado'), /no está en el plan/)
})

test('un paso rojo nunca se integra solo', () => {
  assert.equal(integraSolo(PLAN.pasos[0], ['rojo', 'ambar', 'verde']), false)
  assert.equal(integraSolo(PLAN.pasos[1]), true)
  assert.equal(integraSolo(PLAN.pasos[1], ['verde']), false)
})

test('desfases de puertos por carril', () => {
  assert.deepEqual(desfases(PLAN), { datos: 100, ui: 200 })
})

test('cuota: suma las últimas 5 h y la compara con el tope del proyecto', () => {
  const ahora = Date.parse('2026-10-30T12:00:00-04:00')
  const csv = [
    'fecha,llamada,paso,modelo,effort,session_id,tokens_entrada,tokens_salida,tokens_cache_lectura,tokens_cache_escritura,tokens,total_cost_usd,duracion_s,resultado,usd_por_modelo',
    '2026-10-30T06:00:00-04:00,paso,P1,opus,high,s,1,1,1,1,4,100,1,listo,"claude-opus-5-5=100"',
    '2026-10-30T08:00:00-04:00,paso,P2,opus,high,s,1,1,1,1,4,30,1,listo,claude-opus-5-5=30',
    '2026-10-30T11:00:00-04:00,ruteo,P3,sonnet,low,s,1,1,1,1,4,10,1,listo,',
  ].join('\n')
  const filas = leerConsumo(csv)
  assert.equal(filas.length, 3)
  assert.equal(fraccionDeCuota(filas, 80, 50, ahora), 1) // 40 USD de un tope de 40
  assert.equal(fraccionDeCuota(filas, 0, 50, ahora), null)
})

test('leerPlan acepta YAML y el tablero lista cada carril', () => {
  const plan = leerPlan(`esquema: plan/v1
agentes_disponibles: [claude]
carriles:
  - {id: datos, dueno_de: [supabase/]}
pasos:
  - id: P01
    titulo: Esquema
    depende_de: []
    carril: datos
    riesgo: rojo
    modulos: [supabase/migrations/]
    ruteo: {agente: claude, modelo: opus, effort: xhigh, modo: plan→manual, sesion: nueva, revisor: claude-sesion-nueva}
    verificacion: {nivel: 1, comando: pnpm db:probar}
    terminado: db:probar verde
`)
  assert.deepEqual(problemasDelPlan(plan), [])
  const t = tablero(plan, estadoInicial(plan), { ahora: 'x' })
  assert.match(t, /0 de 1 pasos integrados · cuota de la ventana: sin calibrar/)
  assert.match(t, /\| · \| P01 Esquema \| rojo \| — \| — \|/)
})
