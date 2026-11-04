#!/usr/bin/env node
// El coordinador de los carriles: reparte los pasos de plan.yaml entre los pilotos, integra los PR que puede integrar solo y lleva la
// cuenta de la cuota común. No es un modelo y no edita el repo: su estado vive en `<carpeta común de git>/coordinador/` (fuera del
// árbol y común a todos los worktrees), con un candado para que dos pilotos no tomen el mismo paso. La lógica está en `plan.mjs`.
//
//   coordinador.mjs validar                     el plan corre en paralelo sin choques (exit 1 si no)
//   coordinador.mjs siguiente <carril>          JSON: {accion: paso|esperar|terminado, …}; un paso queda asignado al carril
//   coordinador.mjs publicado <paso> <pr>       el piloto abrió el PR del paso
//   coordinador.mjs liberar <paso> [motivo]     el paso vuelve a pendiente (el piloto lo abandonó)
//   coordinador.mjs integrado <paso>            la persona lo integró a mano (lo normal es que lo vea `sincronizar`)
//   coordinador.mjs sincronizar                 mira los PR publicados: integra los que puede (verde/ámbar con CI verde) y anota el resto
//   coordinador.mjs cuota                       la fracción usada de la ventana de 5 h, si está calibrada
//   coordinador.mjs tablero                     el tablero en Markdown (y en <común>/coordinador/TABLERO.md)
//
// Variables: COORD_PLAN (docs/plan.yaml), COORD_DIR (<común>/coordinador), COORD_GH (gh), COORD_MERGE_AUTO (verde,ambar),
// COORD_USD_VENTANA (USD equivalentes de una ventana de 5 h entera, medidos; sin él la cuota no se calcula), COORD_TOPE_PCT (100: el
// % de la ventana que puede usar este proyecto, de la semilla), COORD_UMBRAL (0.8). Se prueba en `coordinador.test.mjs`.
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import {
  estadoInicial,
  fraccionDeCuota,
  integraSolo,
  leerConsumo,
  leerPlan,
  marcar,
  problemasDelPlan,
  siguiente,
  tablero,
} from './plan.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const raiz = () => git('rev-parse', '--show-toplevel')
const DIR =
  process.env.COORD_DIR ||
  join(git('rev-parse', '--path-format=absolute', '--git-common-dir'), 'coordinador')
const PLAN = process.env.COORD_PLAN || join(raiz(), 'docs/plan.yaml')
const GH = process.env.COORD_GH || 'gh'
const MERGE_AUTO = (process.env.COORD_MERGE_AUTO ?? 'verde,ambar')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const ESTADO = join(DIR, 'estado.json')
const CANDADO = join(DIR, 'candado')

function fallar(msg, codigo = 1) {
  console.error(`coordinador: ${msg}`)
  process.exit(codigo)
}

function cargarPlan() {
  if (!existsSync(PLAN)) fallar(`no está el plan en ${PLAN} (COORD_PLAN)`)
  return leerPlan(readFileSync(PLAN, 'utf8'))
}

// El candado: un directorio (mkdir es atómico). Si quedó de un proceso que ya no vive, o tiene más de 10 min, se rompe.
function conCandado(fn) {
  mkdirSync(DIR, { recursive: true })
  const limite = Date.now() + 30_000
  for (;;) {
    try {
      mkdirSync(CANDADO)
      writeFileSync(join(CANDADO, 'pid'), String(process.pid))
      break
    } catch {
      let viejo = false
      try {
        const pid = Number(readFileSync(join(CANDADO, 'pid'), 'utf8'))
        try {
          process.kill(pid, 0)
        } catch {
          viejo = true
        }
        if (Date.now() - statSync(CANDADO).mtimeMs > 600_000) viejo = true
      } catch {
        viejo = Date.now() - (existsSync(CANDADO) ? statSync(CANDADO).mtimeMs : 0) > 5_000
      }
      if (viejo) rmSync(CANDADO, { recursive: true, force: true })
      else if (Date.now() > limite)
        fallar('el candado del coordinador está tomado hace más de 30 s', 75)
      else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
    }
  }
  try {
    return fn()
  } finally {
    rmSync(CANDADO, { recursive: true, force: true })
  }
}

function leerEstado(plan) {
  const previo = existsSync(ESTADO) ? JSON.parse(readFileSync(ESTADO, 'utf8')) : { pasos: {} }
  return estadoInicial(plan, previo)
}
function guardarEstado(estado) {
  writeFileSync(`${ESTADO}.tmp`, JSON.stringify(estado, null, 2) + '\n')
  renameSync(`${ESTADO}.tmp`, ESTADO)
}

// Los consumo.csv de todos los worktrees de un repo (cada carril escribe el suyo en .piloto/).
function filasDeConsumo(repo) {
  let salida
  try {
    salida = execFileSync('git', ['-C', repo, 'worktree', 'list', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return []
  }
  return salida
    .split('\n')
    .filter((l) => l.startsWith('worktree '))
    .flatMap((l) => {
      const f = join(l.slice('worktree '.length), '.piloto/consumo.csv')
      return existsSync(f) ? leerConsumo(readFileSync(f, 'utf8')) : []
    })
}

// La cuota es UNA para todos los proyectos de la cuenta (la ventana de 5 h de Max). Dos límites, y vale el más cerca:
// todo lo que gastaron los proyectos de ~/.config/kit/proyectos.txt (una ruta por línea) contra la ventana entera, y lo de este
// proyecto contra su tope (COORD_TOPE_PCT, de la semilla). COORD_USD_VENTANA se mide.
function cuota() {
  const usd = Number(process.env.COORD_USD_VENTANA || 0)
  if (!usd) return null
  const propio = raiz()
  const lista =
    process.env.COORD_PROYECTOS || join(process.env.HOME ?? '', '.config/kit/proyectos.txt')
  const otros = existsSync(lista)
    ? readFileSync(lista, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && l !== propio)
    : []
  const delProyecto = filasDeConsumo(propio)
  const todas = [...delProyecto, ...otros.flatMap(filasDeConsumo)]
  return Math.max(
    fraccionDeCuota(todas, usd, 100),
    fraccionDeCuota(delProyecto, usd, Number(process.env.COORD_TOPE_PCT || 100)),
  )
}

function gh(...args) {
  return execFileSync(GH, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

const CHECK_BIEN = new Set(['SUCCESS', 'SKIPPED', 'NEUTRAL'])
function sincronizar(plan, estado) {
  const informe = []
  for (const paso of plan.pasos) {
    const e = estado.pasos[paso.id]
    if (e.estado !== 'publicado' || !e.pr) continue
    let pr
    try {
      pr = JSON.parse(gh('pr', 'view', String(e.pr), '--json', 'state,mergeable,statusCheckRollup'))
    } catch (err) {
      informe.push(
        `${paso.id}: no se pudo mirar el PR #${e.pr} (${String(err.message).split('\n')[0]})`,
      )
      continue
    }
    if (pr.state === 'MERGED') {
      estado = marcar(estado, paso.id, 'integrado', { arreglar: null })
      informe.push(`${paso.id}: integrado (#${e.pr})`)
      continue
    }
    if (pr.state === 'CLOSED') {
      informe.push(`${paso.id}: el PR #${e.pr} se cerró sin integrar: lo decide la persona`)
      continue
    }
    const checks = pr.statusCheckRollup ?? []
    const pendiente = checks.some((c) => (c.status ?? 'COMPLETED') !== 'COMPLETED')
    const rojo = checks.some(
      (c) => (c.status ?? 'COMPLETED') === 'COMPLETED' && !CHECK_BIEN.has(c.conclusion ?? c.state),
    )
    const arreglar =
      pr.mergeable === 'CONFLICTING' ? 'conflicto con main' : rojo ? 'CI en rojo' : null
    if (arreglar !== (e.arreglar ?? null)) {
      estado = { ...estado, pasos: { ...estado.pasos, [paso.id]: { ...e, arreglar } } }
      if (arreglar) informe.push(`${paso.id}: ${arreglar} (#${e.pr}): vuelve a su carril`)
    }
    if (arreglar || pendiente || checks.length === 0) continue
    if (!integraSolo(paso, MERGE_AUTO)) {
      informe.push(`${paso.id}: CI en verde; es ${paso.riesgo}: lo integra la persona (#${e.pr})`)
      continue
    }
    if (pr.mergeable !== 'MERGEABLE') continue
    try {
      gh('pr', 'merge', String(e.pr), '--squash', '--delete-branch')
      estado = marcar(estado, paso.id, 'integrado', { arreglar: null, integro: 'coordinador' })
      informe.push(`${paso.id}: integrado por el coordinador (#${e.pr}, ${paso.riesgo})`)
    } catch (err) {
      informe.push(
        `${paso.id}: no se pudo integrar #${e.pr} (${String(err.message).split('\n')[0]})`,
      )
    }
  }
  return { estado, informe }
}

const [orden, ...args] = process.argv.slice(2)
try {
  switch (orden) {
    case 'validar': {
      const problemas = problemasDelPlan(cargarPlan())
      for (const p of problemas) console.error(`✗ ${p}`)
      if (problemas.length) process.exit(1)
      console.log('✓ el plan corre en paralelo sin choques')
      break
    }
    case 'siguiente': {
      const [carril] = args
      if (!carril) fallar('uso: siguiente <carril>', 64)
      const plan = cargarPlan()
      const problemas = problemasDelPlan(plan)
      if (problemas.length) fallar(`el plan no es válido: ${problemas[0]} (corre «validar»)`)
      const fraccion = cuota()
      const salida = conCandado(() => {
        let estado = leerEstado(plan)
        const r = siguiente(plan, estado, carril, {
          cuota: fraccion,
          umbral: Number(process.env.COORD_UMBRAL || 0.8),
        })
        if (r.accion === 'paso' && estado.pasos[r.paso.id].estado !== 'asignado') {
          estado = marcar(estado, r.paso.id, 'asignado', {
            carril,
            arreglar: r.arreglar ?? null,
            motivo_arreglo: r.arreglar ?? null,
          })
        }
        guardarEstado(estado)
        return r.accion === 'paso'
          ? {
              accion: 'paso',
              paso: r.paso.id,
              rama: r.rama,
              retomar: r.retomar,
              arreglar: r.arreglar ?? null,
              titulo: r.paso.titulo,
              riesgo: r.paso.riesgo,
              ruteo: r.paso.ruteo,
              verificacion: r.paso.verificacion,
              terminado: r.paso.terminado,
              decisiones: r.paso.decisiones ?? [],
              modulos: r.paso.modulos,
            }
          : r
      })
      console.log(JSON.stringify(salida))
      break
    }
    case 'publicado': {
      const [paso, pr] = args
      if (!paso || !/^\d+$/.test(pr ?? '')) fallar('uso: publicado <paso> <número de PR>', 64)
      const plan = cargarPlan()
      conCandado(() =>
        guardarEstado(
          marcar(leerEstado(plan), paso, 'publicado', { pr: Number(pr), arreglar: null }),
        ),
      )
      console.log(`✓ ${paso} publicado (#${pr})`)
      break
    }
    case 'liberar': {
      const [paso, ...motivo] = args
      if (!paso) fallar('uso: liberar <paso> [motivo]', 64)
      const plan = cargarPlan()
      conCandado(() =>
        guardarEstado(
          marcar(leerEstado(plan), paso, 'pendiente', { motivo: motivo.join(' ') || null }),
        ),
      )
      console.log(`✓ ${paso} vuelve a pendiente`)
      break
    }
    case 'integrado': {
      const [paso] = args
      if (!paso) fallar('uso: integrado <paso>', 64)
      const plan = cargarPlan()
      conCandado(() =>
        guardarEstado(
          marcar(leerEstado(plan), paso, 'integrado', { integro: 'persona', arreglar: null }),
        ),
      )
      console.log(`✓ ${paso} integrado`)
      break
    }
    case 'sincronizar': {
      const plan = cargarPlan()
      const informe = conCandado(() => {
        const r = sincronizar(plan, leerEstado(plan))
        guardarEstado(r.estado)
        return r.informe
      })
      for (const l of informe) console.log(l)
      break
    }
    case 'cuota': {
      const f = cuota()
      console.log(
        f === null
          ? 'sin calibrar (COORD_USD_VENTANA)'
          : `${Math.round(f * 100)} % del tope de la ventana de 5 h`,
      )
      break
    }
    case 'tablero': {
      const plan = cargarPlan()
      const texto = tablero(plan, leerEstado(plan), { cuota: cuota() })
      mkdirSync(DIR, { recursive: true })
      writeFileSync(join(DIR, 'TABLERO.md'), texto)
      process.stdout.write(texto)
      break
    }
    default:
      fallar(
        'órdenes: validar · siguiente <carril> · publicado <paso> <pr> · liberar <paso> · integrado <paso> · sincronizar · cuota · tablero',
        64,
      )
  }
} catch (err) {
  // Una transición inválida o un plan roto: el motivo en una línea, sin la pila.
  fallar(err instanceof Error ? err.message : String(err))
}
