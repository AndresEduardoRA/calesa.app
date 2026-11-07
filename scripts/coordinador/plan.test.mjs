import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  caminoCritico,
  desfases,
  estadoInicial,
  fraccionDeCuota,
  guardasEn,
  integraSolo,
  leerConsumo,
  leerPlan,
  marcar,
  marcarPedido,
  ordenTopologico,
  pedir,
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

test('una ruta «compartido» la pueden tocar pasos paralelos de carriles distintos; sin ella, no', () => {
  const dos = (compartido) => ({
    ...PLAN,
    compartido,
    carriles: [
      { id: 'datos', dueno_de: ['src/modules/x/infra/'] },
      { id: 'ui', dueno_de: ['src/modules/x/features/', 'src/app/'] },
    ],
    pasos: [
      paso('P01', 'datos', [], ['src/modules/x/infra/', 'supabase/migrations/'], 'ambar'),
      paso('P03', 'ui', [], ['src/app/', 'supabase/migrations/'], 'verde'),
    ],
  })
  assert.ok(problemasDelPlan(dos([])).some((x) => x.includes('supabase/migrations/')))
  assert.deepEqual(problemasDelPlan(dos(['supabase/migrations/'])), [])
})

test('un carril base puede poseer lo que contiene a otros, si sus pasos no corren a la vez con ellos', () => {
  const plan = (depende) => ({
    ...PLAN,
    carriles: [
      { id: 'base', base: true, dueno_de: ['src/modules/x/'] },
      { id: 'ui', dueno_de: ['src/modules/x/features/'] },
    ],
    pasos: [
      paso('P01', 'base', [], ['src/modules/x/'], 'ambar'),
      paso('P02', 'ui', depende, ['src/modules/x/features/lista/'], 'verde'),
    ],
  })
  assert.deepEqual(problemasDelPlan(plan(['P01'])), [])
  assert.ok(problemasDelPlan(plan([])).some((x) => x.includes('pueden correr a la vez')))
  const sinBase = plan(['P01'])
  sinBase.carriles[0] = { id: 'base', dueno_de: ['src/modules/x/'] }
  assert.ok(problemasDelPlan(sinBase).some((x) => x.startsWith('OWNERS')))
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

test('con sus pasos integrados, el carril espera pedidos hasta que termine el plan entero', () => {
  let e = estadoInicial(PLAN)
  const integrar = (est, id) =>
    marcar(marcar(marcar(est, id, 'asignado'), id, 'publicado', { pr: 1 }), id, 'integrado')
  for (const id of ['P01', 'P02']) e = integrar(e, id)
  assert.match(siguiente(PLAN, e, 'datos').motivo, /atiende pedidos hasta que el plan termine/)
  for (const id of ['P03', 'P04', 'P05']) e = integrar(e, id)
  assert.deepEqual(siguiente(PLAN, e, 'datos'), { accion: 'terminado' })
})

test('transiciones inválidas fallan', () => {
  const e = estadoInicial(PLAN)
  assert.throws(() => marcar(e, 'P01', 'integrado'), /no puede pasar de pendiente a integrado/)
  assert.throws(() => marcar(e, 'P99', 'asignado'), /no está en el plan/)
})

test('un paso rojo no se integra solo salvo que COORD_MERGE_AUTO lo nombre a propósito', () => {
  assert.equal(integraSolo(PLAN.pasos[0]), false)
  assert.equal(integraSolo(PLAN.pasos[0], ['ambar', 'verde']), false)
  assert.equal(integraSolo(PLAN.pasos[0], ['rojo', 'ambar', 'verde']), true)
  assert.equal(integraSolo(PLAN.pasos[1]), true)
  assert.equal(integraSolo(PLAN.pasos[1], ['verde']), false)
})

// Un plan con carril base (el A de importadora): posee todo y los demás, sus áreas.
const CON_BASE = {
  ...PLAN,
  carriles: [
    { id: 'a', base: true, dueno_de: ['src/', 'scripts/'] },
    { id: 'datos', dueno_de: ['supabase/', 'src/modules/x/infra/'] },
    { id: 'ui', dueno_de: ['src/modules/x/features/', 'scripts/guardas/registro-ui.ts'] },
  ],
}

test('pedir: va al dueño más preciso de sus archivos, si no al base; uno abierto por paso; nunca a sí mismo', () => {
  let e = estadoInicial(CON_BASE)
  let r = pedir(CON_BASE, e, {
    de: 'ui',
    paso: 'P04',
    texto: 'el loading sin el barril',
    archivos: ['src/app/x/loading.tsx'],
  })
  assert.equal(r.pedido.id, 'pedido-1')
  assert.equal(r.pedido.para, 'a')
  assert.equal(r.nuevo, true)
  e = r.estado
  assert.equal(pedir(CON_BASE, e, { de: 'ui', paso: 'P04', texto: 'otra vez' }).nuevo, false)
  r = pedir(CON_BASE, e, {
    de: 'ui',
    paso: 'P05',
    texto: 'un índice',
    archivos: ['src/modules/x/infra/lista.ts'],
  })
  assert.equal(r.pedido.para, 'datos')
  assert.equal(r.pedido.id, 'pedido-2')
  assert.equal(
    pedir(CON_BASE, e, { de: 'datos', paso: 'P02', texto: 'sin archivos' }).pedido.para,
    'a',
  )
  assert.throws(
    () => pedir(CON_BASE, e, { de: 'a', paso: 'P01', texto: 'nada' }),
    /no hay a qué carril|posee lo que pide/,
  )
  // El estado lo conserva al recargar el plan.
  assert.equal(estadoInicial(CON_BASE, r.estado).pedidos.length, 2)
})

test('pedir: dos carriles que se esperan son un ciclo, y un pedido se cierra sin cambios', () => {
  let e = estadoInicial(CON_BASE)
  e = pedir(CON_BASE, e, {
    de: 'ui',
    paso: 'P04',
    texto: 'algo',
    archivos: ['supabase/x.sql'],
  }).estado
  assert.throws(
    () =>
      pedir(CON_BASE, e, {
        de: 'datos',
        paso: 'P02',
        texto: 'otra cosa',
        archivos: ['scripts/guardas/registro-ui.ts'],
      }),
    /ciclo: el carril ui espera al datos \(pedido-1\)/,
  )
  e = marcarPedido(marcarPedido(e, 'pedido-1', 'asignado'), 'pedido-1', 'integrado', {
    sin_cambios: true,
  })
  assert.equal(e.pedidos[0].estado, 'integrado')
  assert.equal(siguiente(CON_BASE, e, 'datos').paso.id, 'P01') // cerrado: ya no se lo vuelve a dar
})

test('guardasEn: las rutas que protegen al piloto', () => {
  assert.deepEqual(
    guardasEn([
      'scripts/piloto/bucle.sh',
      'src/app/x.tsx',
      '.github/workflows/ci.yml',
      '.claude/skills/piloto/SKILL.md',
      '.claude/skills/feature/SKILL.md',
    ]),
    ['scripts/piloto/bucle.sh', '.github/workflows/ci.yml', '.claude/skills/piloto/SKILL.md'],
  )
})

test('siguiente: un pedido va antes que lo propio del carril, también entre partes de un paso asignado', () => {
  let e = estadoInicial(CON_BASE)
  e = marcar(e, 'P01', 'asignado', { carril: 'datos' })
  e = pedir(CON_BASE, e, {
    de: 'ui',
    paso: 'P04',
    texto: 'un índice',
    archivos: ['supabase/x.sql'],
  }).estado
  let r = siguiente(CON_BASE, e, 'datos')
  assert.equal(r.paso.id, 'pedido-1')
  assert.equal(r.rama, 'datos/pedido-1')
  assert.equal(r.retomar, false)
  assert.equal(r.pedido.texto, 'un índice')
  e = marcarPedido(e, 'pedido-1', 'asignado')
  assert.equal(siguiente(CON_BASE, e, 'datos').retomar, true)
  e = marcarPedido(e, 'pedido-1', 'publicado', { pr: 9 })
  assert.equal(siguiente(CON_BASE, e, 'datos').paso.id, 'P01') // publicado: vuelve a lo suyo
  e = marcarPedido(e, 'pedido-1', 'integrado')
  assert.throws(() => marcarPedido(e, 'pedido-1', 'asignado'), /no puede pasar de integrado/)
  assert.throws(() => marcarPedido(e, 'pedido-7', 'asignado'), /no hay un pedido/)
})

test('el tablero muestra la parte publicada de un paso y los pedidos abiertos', () => {
  let e = estadoInicial(CON_BASE)
  e = marcar(e, 'P01', 'asignado', { carril: 'datos', pr_parcial: 31 })
  e = pedir(CON_BASE, e, { de: 'ui', paso: 'P04', texto: 'el registro | de ui' }).estado
  const t = tablero(CON_BASE, e, { ahora: 'hoy' })
  assert.match(t, /#31 \(parte\)/)
  assert.match(t, /## Pedidos entre carriles/)
  assert.match(t, /pedido-1 \(P04\) \| ui → a \| el registro \/ de ui/)
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

test('migraciones de un carril: opcional, bien escritas, sin repetir y sin pisarse (4.15-5)', () => {
  const con = (datos, ui, extra = {}) => {
    const p = structuredClone(PLAN)
    p.carriles[0] = { ...p.carriles[0], migraciones: datos }
    p.carriles[1] = { ...p.carriles[1], migraciones: ui }
    return Object.assign(p, extra)
  }
  const problemas = (plan) => problemasDelPlan(plan).filter((x) => x.includes('MIGRACIONES'))
  assert.deepEqual(problemasDelPlan(con(['formula', 'diseno'], ['papelera'])), [])
  assert.deepEqual(problemasDelPlan(con(undefined, [])), [])
  assert.match(problemas(con(['Formula'], []))[0] ?? '', /Formula/)
  assert.match(problemas(con(['a b'], []))[0] ?? '', /a b/)
  assert.match(problemas(con(['formula', 'formula'], []))[0] ?? '', /formula.*repetid/)
  assert.match(problemas(con('formula', []))[0] ?? '', /lista/)
  assert.match(problemas(con(['formula'], ['formula_x']))[0] ?? '', /datos y ui comparten formula/)
  assert.match(problemas(con(['formula'], ['formula']))[0] ?? '', /datos y ui comparten formula/)
  const base = con(['formula'], [])
  base.carriles[0].base = true
  assert.match(problemas(base)[0] ?? '', /el carril base crea migraciones de cualquier dominio/)
})
