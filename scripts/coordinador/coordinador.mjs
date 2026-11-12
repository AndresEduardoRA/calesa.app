#!/usr/bin/env node
// El coordinador de los carriles: reparte los pasos de plan.yaml entre los pilotos, integra los PR que puede integrar solo y lleva la
// cuenta de la cuota común. No es un modelo y no edita el repo: su estado vive en `<carpeta común de git>/coordinador/` (fuera del
// árbol y común a todos los worktrees), con un candado para que dos pilotos no tomen el mismo paso. La lógica está en `plan.mjs`.
//
//   coordinador.mjs validar                     el plan corre en paralelo sin choques (exit 1 si no)
//   coordinador.mjs siguiente <carril>          JSON: {accion: paso|esperar|terminado, …}; un paso queda asignado al carril
//   coordinador.mjs publicado <paso> <pr>       el piloto abrió el PR del paso (o de un pedido: pedido-<n>)
//   coordinador.mjs parcial <paso> <pr>         el piloto abrió el PR de UNA PARTE del paso (sigue asignado; el PR se integra igual)
//   coordinador.mjs pedir <carril> <paso> <texto> [archivo…]   el carril, en su paso, necesita algo de otro: JSON del pedido
//   coordinador.mjs pedido <id>                 JSON de un pedido (el bucle que espera mira si ya se cerró)
//   coordinador.mjs cerrar-pedido <id> [motivo] el dueño lo cerró sin cambios (ya estaba hecho)
//   coordinador.mjs liberar <paso> [motivo]     el paso vuelve a pendiente (el piloto lo abandonó)
//   coordinador.mjs aparcar <paso> <motivo>     el carril no logra cerrarlo: queda aparcado y el carril sigue con otro (lo reintenta después)
//   coordinador.mjs reanudar <paso>             la persona devuelve a la cola un paso aparcado, con la cuenta en cero
//   coordinador.mjs integrado <paso>            la persona lo integró a mano (lo normal es que lo vea `sincronizar`)
//   coordinador.mjs estado <paso>               JSON del estado de un paso (el bucle lo mira antes de preguntar por uno sin cambios)
//   coordinador.mjs sincronizar                 mira los PR publicados: integra los que puede (verde/ámbar con CI verde) y anota el resto;
//                                               después borra las ramas ya integradas (limpiar-ramas.mjs; COORD_LIMPIAR=0 lo apaga)
//   coordinador.mjs cuota                       la fracción usada de la ventana de 5 h, si está calibrada
//   coordinador.mjs tablero                     el tablero en Markdown (y en <común>/coordinador/TABLERO.md)
//
// El plan se lee de `origin/main:docs/plan.yaml` (lo integrado, como la copia de los scripts del piloto): cada carril corre esto desde su
// árbol, y con el plan de la rama dos carriles podían ver planes distintos. `validar` mira el archivo del árbol (es lo que un PR cambia), y
// `COORD_PLAN` manda sobre los dos. Sin `origin/main` (un repo sin remoto, las pruebas), el archivo del árbol.
// Variables: COORD_PLAN (docs/plan.yaml), COORD_APARCADOS_MAX (2: reintentos de un paso aparcado), COORD_APARCADO_ENFRIAR (1800 s), COORD_DIR (<común>/coordinador), COORD_GH (gh), COORD_MERGE_AUTO (verde,ambar),
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
import { limpiarRamas, ramasProtegidas } from './limpiar-ramas.mjs'
import { atenderColgado, gh, integrar, integrarSueltos, mirarPr, reintentarUnaVez } from './pr.mjs'
import { renumerarMigraciones } from './renumerar.mjs'
import { unirMain } from './unir-main.mjs'
import {
  aparcar,
  estadoInicial,
  fraccionDeCuota,
  integraSolo,
  leerConsumo,
  leerPlan,
  marcar,
  marcarPedido,
  pedir,
  problemasDelPlan,
  reanudar,
  siguiente,
  tablero,
} from './plan.mjs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const raiz = () => git('rev-parse', '--show-toplevel')
const DIR =
  process.env.COORD_DIR ||
  join(git('rev-parse', '--path-format=absolute', '--git-common-dir'), 'coordinador')
const PLAN = process.env.COORD_PLAN || join(raiz(), 'docs/plan.yaml')
const PLAN_EN_MAIN = 'origin/main:docs/plan.yaml'
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

function cargarPlan({ delArbol = false } = {}) {
  if (!delArbol && !process.env.COORD_PLAN) {
    try {
      const texto = execFileSync('git', ['show', PLAN_EN_MAIN], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 16 * 1024 * 1024,
      })
      if (texto.trim()) return leerPlan(texto)
    } catch {
      // Sin remoto o sin el archivo en main: vale el del árbol.
    }
  }
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
        // Sin pid legible: el candado se está creando o el otro lo acaba de soltar (entre existsSync y statSync caía con ENOENT:
        // el CI del PR 69, «dos carriles piden a la vez»). Viejo sólo si lleva más de 5 s así; si ya no está, se reintenta.
        try {
          viejo = Date.now() - statSync(CANDADO).mtimeMs > 5_000
        } catch {
          viejo = false
        }
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

// El plan para repartir: el de main si es válido, y entonces queda guardado; si no lo es (un PR que lo rompió y se integró en rojo), el
// último válido, y se dice por stderr. El 7-11 un plan inválido dejó al carril A cuatro horas sin poder pedir paso.
function planParaRepartir() {
  const plan = cargarPlan()
  const problemas = problemasDelPlan(plan)
  const guardado = join(DIR, 'plan.valido.json')
  if (problemas.length === 0) {
    try {
      mkdirSync(DIR, { recursive: true })
      const texto = JSON.stringify(plan)
      if (!existsSync(guardado) || readFileSync(guardado, 'utf8') !== texto) {
        writeFileSync(`${guardado}.${process.pid}.tmp`, texto)
        renameSync(`${guardado}.${process.pid}.tmp`, guardado)
      }
    } catch {
      // Sin poder guardarlo, nada cambia: la próxima vez se intenta de nuevo.
    }
    return plan
  }
  if (existsSync(guardado)) {
    console.error(
      `coordinador: el plan no es válido (${problemas[0]}): sigo con el último válido hasta que main traiga uno bueno.`,
    )
    return JSON.parse(readFileSync(guardado, 'utf8'))
  }
  return fallar(`el plan no es válido: ${problemas[0]} (corre «validar»)`)
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

const textoGuardas = (g) =>
  `toca las guardas del piloto (${g.slice(0, 3).join(', ')}${g.length > 3 ? '…' : ''}): lo integra la persona`

// Las partes publicadas de un paso que sigue asignado (`pr_parcial`): se integran con su CI en verde, con commit de merge y sin borrar la
// rama, porque el carril sigue en ella. Antes nadie las integraba en el repo: lo hacía un script fuera de él (integrar-verdes.sh).
function sincronizarParciales(plan, estado, informe) {
  for (const paso of plan.pasos) {
    const e = estado.pasos[paso.id]
    if (!e?.pr_parcial) continue
    let pr
    try {
      pr = mirarPr(e.pr_parcial)
    } catch (err) {
      informe.push(
        `${paso.id}: no se pudo mirar la parte #${e.pr_parcial} (${String(err.message).split('\n')[0]})`,
      )
      continue
    }
    const quitar = () => {
      const resto = { ...estado.pasos[paso.id] }
      delete resto.pr_parcial
      estado = { ...estado, pasos: { ...estado.pasos, [paso.id]: resto } }
    }
    if (pr.estado === 'MERGED') {
      informe.push(`${paso.id}: parte integrada (#${e.pr_parcial})`)
      quitar()
      continue
    }
    if (pr.estado === 'CLOSED') {
      informe.push(`${paso.id}: la parte #${e.pr_parcial} se cerró sin integrar`)
      quitar()
      continue
    }
    ;({ estado, pr } = atenderColgado(e.pr_parcial, pr, estado, informe, paso.id))
    if (pr.arreglar === 'CI en rojo') {
      const r = reintentarUnaVez(e.pr_parcial, pr, estado)
      estado = r.estado
      if (r.reintentado) {
        if (r.aviso) informe.push(`${paso.id}: la parte #${e.pr_parcial} quedó en rojo: ${r.aviso}`)
        continue
      }
    }
    if (!pr.listo) continue
    if (!integraSolo(paso, MERGE_AUTO)) {
      informe.push(
        `${paso.id}: la parte #${e.pr_parcial} está en verde; es ${paso.riesgo}: la integra la persona`,
      )
      continue
    }
    if (pr.guardas.length) {
      informe.push(`${paso.id}: la parte #${e.pr_parcial} ${textoGuardas(pr.guardas)}`)
      continue
    }
    try {
      integrar(e.pr_parcial, pr, '--merge')
      informe.push(
        `${paso.id}: parte integrada por el coordinador (#${e.pr_parcial}, ${paso.riesgo})`,
      )
      quitar()
    } catch (err) {
      informe.push(
        `${paso.id}: no se pudo integrar la parte #${e.pr_parcial} (${String(err.message).split('\n')[0]})`,
      )
    }
  }
  return estado
}

// Los pedidos publicados: como un paso ámbar (un arreglo chico del carril dueño, con su CI). Al integrarse, el carril que esperaba ve
// cambiar main y se retoma (bucle.sh › esperar_main).
function sincronizarPedidos(estado, informe) {
  for (const pd of estado.pedidos ?? []) {
    if (pd.estado !== 'publicado' || !pd.pr) continue
    let pr
    try {
      pr = mirarPr(pd.pr)
    } catch (err) {
      informe.push(
        `${pd.id}: no se pudo mirar el PR #${pd.pr} (${String(err.message).split('\n')[0]})`,
      )
      continue
    }
    if (pr.estado === 'MERGED') {
      estado = marcarPedido(estado, pd.id, 'integrado', { arreglar: null })
      informe.push(`${pd.id}: integrado (#${pd.pr}); el carril ${pd.de} se retoma`)
      continue
    }
    if (pr.estado === 'CLOSED') {
      informe.push(`${pd.id}: el PR #${pd.pr} se cerró sin integrar: lo decide la persona`)
      continue
    }
    ;({ estado, pr } = atenderColgado(pd.pr, pr, estado, informe, pd.id))
    if (pr.arreglar !== (pd.arreglar ?? null)) {
      estado = {
        ...estado,
        pedidos: estado.pedidos.map((x) => (x.id === pd.id ? { ...x, arreglar: pr.arreglar } : x)),
      }
      if (pr.arreglar)
        informe.push(`${pd.id}: ${pr.arreglar} (#${pd.pr}): vuelve al carril ${pd.para}`)
    }
    if (!pr.listo) continue
    if (!MERGE_AUTO.includes('ambar')) {
      informe.push(`${pd.id}: CI en verde: lo integra la persona (#${pd.pr})`)
      continue
    }
    if (pr.guardas.length) {
      informe.push(`${pd.id}: #${pd.pr} ${textoGuardas(pr.guardas)}`)
      continue
    }
    try {
      integrar(pd.pr, pr, '--squash', '--delete-branch')
      estado = marcarPedido(estado, pd.id, 'integrado', { arreglar: null, integro: 'coordinador' })
      informe.push(
        `${pd.id}: integrado por el coordinador (#${pd.pr}); el carril ${pd.de} se retoma`,
      )
    } catch (err) {
      informe.push(
        `${pd.id}: no se pudo integrar #${pd.pr} (${String(err.message).split('\n')[0]})`,
      )
    }
  }
  return estado
}

// El verde que un commit del propio coordinador hereda del CI del commit anterior (lo renumeró o le unió main sobre un CI en verde): vale
// mientras la punta sea ese commit y su CI nuevo no haya dicho ya que no.
const heredaVerde = (e, pr) =>
  Boolean(pr.oid) && (e.renumerado_verde === pr.oid || e.unido_verde === pr.oid) && !pr.rojo

function sincronizar(plan, estado) {
  const informe = []
  const anotar = (id, datos) => {
    estado = { ...estado, pasos: { ...estado.pasos, [id]: { ...estado.pasos[id], ...datos } } }
  }
  let main = ''
  try {
    main = git('rev-parse', '--verify', '--quiet', 'origin/main')
  } catch {
    // Sin origin/main (las pruebas, un repo sin remoto) no se une nada.
  }
  estado = sincronizarParciales(plan, estado, informe)
  estado = sincronizarPedidos(estado, informe)
  for (const paso of plan.pasos) {
    const e = estado.pasos[paso.id]
    // Un paso aparcado con su PR abierto: si ese PR se integró (su CI se puso verde tras el aviso, o lo integró alguien), está hecho.
    if (e.estado === 'aparcado' && e.pr && !e.pr_parcial) {
      try {
        if (mirarPr(e.pr).estado === 'MERGED') {
          estado = marcar(estado, paso.id, 'integrado', { arreglar: null })
          informe.push(`${paso.id}: estaba aparcado y su PR #${e.pr} ya está integrado: integrado`)
        }
      } catch {
        // Se vuelve a mirar en la vuelta siguiente.
      }
      continue
    }
    if (e.estado !== 'publicado' || !e.pr) continue
    let pr
    try {
      pr = mirarPr(e.pr)
    } catch (err) {
      informe.push(
        `${paso.id}: no se pudo mirar el PR #${e.pr} (${String(err.message).split('\n')[0]})`,
      )
      continue
    }
    if (pr.estado === 'MERGED') {
      estado = marcar(estado, paso.id, 'integrado', { arreglar: null })
      informe.push(`${paso.id}: integrado (#${e.pr})`)
      continue
    }
    if (pr.estado === 'CLOSED') {
      informe.push(`${paso.id}: el PR #${e.pr} se cerró sin integrar: lo decide la persona`)
      continue
    }
    ;({ estado, pr } = atenderColgado(e.pr, pr, estado, informe, paso.id))
    if (pr.arreglar === 'CI en rojo') {
      const r = reintentarUnaVez(e.pr, pr, estado)
      estado = r.estado
      if (r.reintentado) {
        if (r.aviso) informe.push(`${paso.id}: CI en rojo (#${e.pr}): ${r.aviso}`)
        continue
      }
    }
    // Sólo le falta renumerar migraciones: lo hace el coordinador, sin esperar a que su carril termine el paso en curso (renumerar.mjs).
    if (
      pr.arreglar === 'migración anterior a la última de main' &&
      process.env.COORD_RENUMERAR !== '0'
    ) {
      const r = renumerarMigraciones(pr.rama, pr.oid)
      if (r.hecho) {
        // Con el CI ya en verde, el commit de renumerar (mismo contenido, otra versión) se integra sin esperar otra corrida: el
        // 11-11-2026 cada PR con migraciones pagó de 2 a 6 CI de ≈ 17 min (el 6.10, cinco renumeradas y 7 h abierto), porque mientras
        // corría el segundo entraba otra migración a main. COORD_RENUMERAR_SIN_CI=0 vuelve a esperar al CI.
        // Vale también el verde que ya traía un commit del propio coordinador (renumerado o unido) cuyo CI todavía corre.
        const sinCi =
          (pr.verde || (heredaVerde(e, pr) && pr.integrable)) &&
          r.commit &&
          process.env.COORD_RENUMERAR_SIN_CI !== '0'
        estado = {
          ...estado,
          pasos: {
            ...estado.pasos,
            [paso.id]: {
              ...estado.pasos[paso.id],
              arreglar: null,
              renumerado_verde: sinCi ? r.commit : null,
            },
          },
        }
        informe.push(
          `${paso.id}: renumeré las migraciones de #${e.pr} (${r.pares.join(' ')}): ${sinCi ? 'su CI ya estaba en verde, se integra sin esperar otro' : 'su CI corre otra vez'}`,
        )
        continue
      }
      if (e.arreglar !== pr.arreglar)
        informe.push(`${paso.id}: no pude renumerar #${e.pr} (${r.motivo})`)
    }
    // Choca con main: si los choques son sólo de notas o de registros con puros agregados, el coordinador une main en la rama del PR sin
    // esperar a su carril (unir-main.mjs). Una vez por punta y por main: lo que no se pudo unir no cambia hasta que cambie alguno.
    if (pr.arreglar === 'conflicto con main' && main && process.env.COORD_UNIR !== '0') {
      const clave = `${pr.oid}:${main}`
      if (e.no_unible !== clave) {
        const r = unirMain(pr.rama, pr.oid)
        if (r.hecho) {
          // Sólo notas sobre un CI en verde: el merge no cambia nada de lo que el CI probó y se integra sin esperar otra corrida (con
          // un CI de ≈ 20 min y main moviéndose cada 20, el PR volvía a chocar antes de terminar). Con un registro unido, el CI decide.
          // COORD_UNIR_SIN_CI=0 vuelve a esperar al CI siempre.
          const sinCi =
            r.soloNotas &&
            (pr.ciVerde || heredaVerde(e, pr)) &&
            process.env.COORD_UNIR_SIN_CI !== '0'
          anotar(paso.id, { arreglar: null, unido_verde: sinCi ? r.commit : null })
          informe.push(
            `${paso.id}: uní main a #${e.pr} (${r.unidos.join(' ') || 'sin choques para git'}): ${sinCi ? 'sólo notas y su CI ya estaba en verde, se integra sin esperar otro' : 'su CI corre otra vez'}`,
          )
          continue
        }
        anotar(paso.id, { no_unible: clave })
        informe.push(`${paso.id}: no pude unir main a #${e.pr} (${r.motivo})`)
      }
    }
    // Un «conflicto con main» no se borra mientras GitHub no sepa: tras cada integración contesta UNKNOWN un rato, la marca se iba y
    // el carril que preguntaba justo entonces tomaba un paso nuevo (el 7.02 estuvo así más de 4 h el 11-11-2026).
    const sigueSinSaber = pr.sinSaber && !pr.arreglar && e.arreglar === 'conflicto con main'
    if (pr.arreglar !== (e.arreglar ?? null) && !sigueSinSaber) {
      estado = {
        ...estado,
        pasos: { ...estado.pasos, [paso.id]: { ...estado.pasos[paso.id], arreglar: pr.arreglar } },
      }
      if (pr.arreglar) informe.push(`${paso.id}: ${pr.arreglar} (#${e.pr}): vuelve a su carril`)
    }
    // El commit que el coordinador renumeró, o al que le unió main, sobre un CI en verde: vale ese verde mientras la punta sea ese
    // commit, no choque con main, no le falte renumerar otra vez y su CI nuevo no haya dicho ya que no.
    const yaVerde = heredaVerde(e, pr) && !pr.arreglar && pr.integrable
    if (!pr.listo && !yaVerde) continue
    if (!integraSolo(paso, MERGE_AUTO)) {
      informe.push(`${paso.id}: CI en verde; es ${paso.riesgo}: lo integra la persona (#${e.pr})`)
      continue
    }
    if (pr.guardas.length) {
      informe.push(`${paso.id}: #${e.pr} ${textoGuardas(pr.guardas)}`)
      continue
    }
    try {
      integrar(e.pr, pr, '--squash', '--delete-branch')
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
      const problemas = problemasDelPlan(cargarPlan({ delArbol: true }))
      for (const p of problemas) console.error(`✗ ${p}`)
      if (problemas.length) process.exit(1)
      console.log('✓ el plan corre en paralelo sin choques')
      break
    }
    case 'siguiente': {
      const [carril] = args
      if (!carril) fallar('uso: siguiente <carril>', 64)
      const plan = planParaRepartir()
      const fraccion = cuota()
      const salida = conCandado(() => {
        let estado = leerEstado(plan)
        const r = siguiente(plan, estado, carril, {
          cuota: fraccion,
          umbral: Number(process.env.COORD_UMBRAL || 0.8),
          maxAparcado: Number(process.env.COORD_APARCADOS_MAX ?? 2),
          enfriar: Number(process.env.COORD_APARCADO_ENFRIAR ?? 1800) * 1000,
        })
        if (r.accion === 'paso' && r.pedido) {
          if (r.pedido.estado !== 'asignado')
            estado = marcarPedido(estado, r.pedido.id, 'asignado', { arreglar: r.arreglar ?? null })
        } else if (r.accion === 'paso' && estado.pasos[r.paso.id].estado !== 'asignado') {
          estado = marcar(estado, r.paso.id, 'asignado', {
            carril,
            rama: r.rama,
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
              fase: r.paso.fase ?? null,
              puerta: r.paso.puerta === true,
              cierre: r.paso.cierre === true,
              ...(r.reintento ? { reintento: r.reintento } : {}),
              ...(r.prestado ? { prestado: true } : {}),
              ...(r.pedido
                ? {
                    pedido: {
                      de: r.pedido.de,
                      paso: r.pedido.paso,
                      texto: r.pedido.texto,
                      archivos: r.pedido.archivos ?? [],
                    },
                  }
                : {}),
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
      conCandado(() => {
        const estado = leerEstado(plan)
        guardarEstado(
          /^pedido-\d+$/.test(paso)
            ? marcarPedido(estado, paso, 'publicado', { pr: Number(pr), arreglar: null })
            : // La última parte va en el mismo PR que las anteriores sin integrar: deja de ser una parte (no se integra dos veces).
              marcar(estado, paso, 'publicado', {
                pr: Number(pr),
                arreglar: null,
                pr_parcial: undefined,
              }),
        )
      })
      console.log(`✓ ${paso} publicado (#${pr})`)
      break
    }
    case 'parcial': {
      const [paso, pr] = args
      if (!paso || !/^\d+$/.test(pr ?? '')) fallar('uso: parcial <paso> <número de PR>', 64)
      const plan = cargarPlan()
      conCandado(() => {
        const estado = leerEstado(plan)
        const e = estado.pasos[paso]
        if (!e) fallar(`el paso ${paso} no está en el plan`)
        if (e.estado !== 'asignado') fallar(`el paso ${paso} no está asignado (${e.estado})`)
        guardarEstado({
          ...estado,
          pasos: { ...estado.pasos, [paso]: { ...e, pr_parcial: Number(pr) } },
        })
      })
      console.log(`✓ ${paso}: parte publicada (#${pr})`)
      break
    }
    case 'pedir': {
      const [carril, paso, texto, ...archivos] = args
      if (!carril || !paso || !texto) fallar('uso: pedir <carril> <paso> <texto> [archivo…]', 64)
      const plan = cargarPlan()
      const r = conCandado(() => {
        const r = pedir(plan, leerEstado(plan), { de: carril, paso, texto, archivos })
        guardarEstado(r.estado)
        return r
      })
      console.log(JSON.stringify({ ...r.pedido, nuevo: r.nuevo }))
      break
    }
    case 'pedido': {
      const [id] = args
      if (!id) fallar('uso: pedido <id>', 64)
      const pd = (leerEstado(cargarPlan()).pedidos ?? []).find((p) => p.id === id)
      if (!pd) fallar(`no hay un pedido ${id}`)
      console.log(JSON.stringify(pd))
      break
    }
    case 'cerrar-pedido': {
      const [id, ...motivo] = args
      if (!id) fallar('uso: cerrar-pedido <id> [motivo]', 64)
      const plan = cargarPlan()
      conCandado(() =>
        guardarEstado(
          marcarPedido(leerEstado(plan), id, 'integrado', {
            sin_cambios: true,
            motivo: motivo.join(' ') || null,
          }),
        ),
      )
      console.log(`✓ ${id} cerrado sin cambios`)
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
    case 'aparcar': {
      const [paso, ...motivo] = args
      if (!paso || motivo.length === 0) fallar('uso: aparcar <paso> <motivo>', 64)
      const plan = cargarPlan()
      const veces = conCandado(() => {
        const estado = aparcar(leerEstado(plan), paso, motivo.join(' '))
        guardarEstado(estado)
        return estado.pasos[paso].aparcado_veces
      })
      console.log(`✓ ${paso} aparcado (${veces}.ª vez)`)
      break
    }
    case 'reanudar': {
      const [paso] = args
      if (!paso) fallar('uso: reanudar <paso>', 64)
      const plan = cargarPlan()
      conCandado(() => guardarEstado(reanudar(leerEstado(plan), paso)))
      console.log(`✓ ${paso} vuelve a la cola`)
      break
    }
    case 'estado': {
      const [paso] = args
      if (!paso) fallar('uso: estado <paso>', 64)
      const e = leerEstado(cargarPlan()).pasos[paso]
      if (!e) fallar(`el paso ${paso} no está en el plan`)
      console.log(JSON.stringify(e))
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
      let protegidas
      const informe = conCandado(() => {
        const r = sincronizar(plan, leerEstado(plan))
        r.estado = integrarSueltos(r.estado, r.informe)
        guardarEstado(r.estado)
        protegidas = ramasProtegidas(plan, r.estado)
        return r.informe
      })
      for (const l of informe) console.log(l)
      // Fuera del candado: borrar ramas no cambia el estado y no hace esperar a los carriles. COORD_LIMPIAR=0 lo apaga.
      if (process.env.COORD_LIMPIAR !== '0') {
        try {
          const borradas = limpiarRamas({ gh, git, protegidas })
          if (borradas.length) console.log(`ramas integradas borradas: ${borradas.join(', ')}`)
        } catch (err) {
          console.log(`no se pudieron limpiar las ramas (${String(err.message).split('\n')[0]})`)
        }
      }
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
        'órdenes: validar · siguiente <carril> · publicado <paso> <pr> · parcial <paso> <pr> · pedir <carril> <paso> <texto> [archivo…] · pedido <id> · cerrar-pedido <id> [motivo] · liberar <paso> · aparcar <paso> <motivo> · reanudar <paso> · integrado <paso> · estado <paso> · sincronizar · cuota · tablero',
        64,
      )
  }
} catch (err) {
  // Una transición inválida o un plan roto: el motivo en una línea, sin la pila.
  fallar(err instanceof Error ? err.message : String(err))
}
