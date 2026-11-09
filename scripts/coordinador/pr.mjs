// Lo que el coordinador le pregunta y le pide a GitHub sobre un PR (`gh`): si se puede integrar, si hay que devolverlo a su carril, si su
// CI quedó colgado, y la integración misma. Sin estado propio: el del coordinador entra y sale por parámetro. Lo usa `coordinador.mjs` ›
// `sincronizar`; se prueba, de punta a punta con un `gh` falso, en `coordinador.test.mjs`.
//
// Variables: COORD_GH (gh), COORD_GUARDAS_SOLAS, COORD_IGNORAR_CHECKS (^Vercel), COORD_ROJO_FIRME (^(Nivel 1|Carriles)),
// COORD_COLGADO_ESPERA (600 s).
import { execFileSync } from 'node:child_process'
import { guardasEn } from './plan.mjs'

const GH = process.env.COORD_GH || 'gh'

export function gh(...args) {
  return execFileSync(GH, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

const CHECK_BIEN = new Set(['SUCCESS', 'SKIPPED', 'NEUTRAL'])
// Los checks que no son el CI del proyecto y no deciden nada (COORD_IGNORAR_CHECKS, una expresión regular sobre su nombre): el de Vercel
// es la vista previa del PR, que usa la demo y no migra (docs/ORCA.md); con cientos de PR su tope diario de despliegues daría un rojo
// que no es del código, y el paso volvería a su carril a «arreglar» nada.
const IGNORAR_CHECKS = new RegExp(process.env.COORD_IGNORAR_CHECKS || '^Vercel', 'i')
// Los jobs cuyo rojo es del código y no del runner (COORD_ROJO_FIRME): no se vuelven a correr y no se espera al resto del CI para
// devolver el paso. El 8-11 la guarda de carriles caía en 26 s y el carril se enteraba 52 min después, tras un reintento que caía igual.
const ROJO_FIRME = new RegExp(process.env.COORD_ROJO_FIRME || '^(Nivel 1|Carriles)')
const COLGADO_ESPERA = Number(process.env.COORD_COLGADO_ESPERA ?? 600) * 1000
const MIGRACION = /^supabase\/migrations\/(\d{14})_[^/]+\.sql$/
const nombreDe = (c) => String(c.name ?? c.context ?? '')

// Las migraciones que el PR agrega y que quedaron atrás de la última de origin/main: su CI pasó contra un main más viejo, y al
// integrarlas el orden queda invertido (el #10 entró después del #11 con una versión anterior, 2026-11-06): `db push` a la demo lo
// rechaza. Vuelve a su carril, que las renumera sin sesión (carril.sh › renumerar_migraciones). Sin origin/main no se mira.
function migracionesAtrasadas(archivos) {
  const nuevas = archivos.map((a) => MIGRACION.exec(a)).filter(Boolean)
  if (nuevas.length === 0) return []
  let enMain
  try {
    enMain = new Set(
      execFileSync('git', ['ls-tree', '--name-only', 'origin/main', 'supabase/migrations/'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .split('\n')
        .filter((r) => MIGRACION.test(r)),
    )
  } catch {
    return []
  }
  const ultima =
    [...enMain]
      .map((r) => MIGRACION.exec(r)[1])
      .sort()
      .at(-1) ?? ''
  return nuevas.filter((m) => !enMain.has(m[0]) && m[1] <= ultima).map((m) => m[0])
}

// Lo que dice GitHub de un PR: su estado y, si está abierto, si hay que arreglarlo, si su CI sigue y si se puede integrar.
// Se integra el commit que vio el CI y no otro (`--match-head-commit`: si el carril empujó entre medio, gh se niega y se reintenta en la
// vuelta siguiente), y un PR que toca las guardas del piloto no se integra solo: la copia del bucle sale de main y los tres carriles se
// recargan con ella (COORD_GUARDAS_SOLAS=1 lo deja).
const GUARDAS_SOLAS = process.env.COORD_GUARDAS_SOLAS === '1'
export function mirarPr(numero) {
  const pr = JSON.parse(
    gh(
      'pr',
      'view',
      String(numero),
      '--json',
      'state,mergeable,statusCheckRollup,headRefOid,headRefName,files',
    ),
  )
  const checks = (pr.statusCheckRollup ?? []).filter((c) => !IGNORAR_CHECKS.test(nombreDe(c)))
  // Un estado de commit (el de Vercel: `state`, sin `status`) en PENDING o EXPECTED sigue corriendo; antes contaba como terminado y
  // rojo, y el paso volvía a su carril por un «CI en rojo» que un minuto después era verde (el PR 80, 2026-11-08).
  // Un job cancelado (lo cancela el push siguiente o su tope de tiempo) tampoco es rojo: no hubo veredicto, y el paso volvía a su
  // carril a «arreglar» un CI que no había fallado (PR 69, 2026-11-08). Queda pendiente hasta la corrida siguiente.
  const estadoDe = (c) =>
    c.conclusion === 'CANCELLED'
      ? 'PENDING'
      : (c.status ?? (['PENDING', 'EXPECTED'].includes(c.state) ? 'PENDING' : 'COMPLETED'))
  const pendiente = checks.some((c) => estadoDe(c) !== 'COMPLETED')
  const rojos = checks.filter(
    (c) => estadoDe(c) === 'COMPLETED' && !CHECK_BIEN.has(c.conclusion ?? c.state),
  )
  const rojo = rojos.length > 0
  const firme = rojos.some((c) => ROJO_FIRME.test(nombreDe(c)))
  // Cancelado y sin nada corriendo: nadie va a dar un veredicto de ese commit (lo cortó su tope de tiempo, no un push nuevo).
  const colgado =
    !rojo &&
    checks.some((c) => c.conclusion === 'CANCELLED') &&
    !checks.some((c) => c.conclusion !== 'CANCELLED' && estadoDe(c) !== 'COMPLETED')
  const archivos = (pr.files ?? []).map((f) => f.path)
  const atrasadas = pr.state === 'OPEN' ? migracionesAtrasadas(archivos) : []
  // Rojo es con el CI terminado: con un job todavía corriendo, el reintento de los caídos no se puede pedir (reintentarUnaVez). Salvo el
  // rojo firme, que no se reintenta ni espera.
  const arreglar =
    pr.mergeable === 'CONFLICTING'
      ? 'conflicto con main'
      : rojo && (!pendiente || firme)
        ? 'CI en rojo'
        : atrasadas.length
          ? 'migración anterior a la última de main'
          : null
  const listo = !arreglar && !pendiente && checks.length > 0 && pr.mergeable === 'MERGEABLE'
  const guardas = GUARDAS_SOLAS ? [] : guardasEn(archivos)
  return {
    estado: pr.state,
    arreglar,
    pendiente,
    listo,
    firme,
    colgado,
    oid: pr.headRefOid ?? null,
    rama: pr.headRefName ?? null,
    guardas,
  }
}

// Un CI colgado (cancelado por su tope y sin corrida detrás) dejaba el PR «pendiente» para siempre (#69, 2026-11-08: 89 min hasta que
// alguien lo vio). Se espera COORD_COLGADO_ESPERA s (600) por si viene otra corrida; si no, se vuelve a correr entero, una vez por commit;
// si queda colgado otra vez, es un rojo y vuelve a su carril. Devuelve el estado y el PR (con `arreglar` si ya es un rojo).
export function atenderColgado(numero, pr, estado, informe, etiqueta) {
  const previo = estado.colgados?.[numero]
  const ahora = Date.now()
  if (!pr.colgado || !pr.oid) {
    if (!previo) return { estado, pr }
    const colgados = { ...estado.colgados }
    delete colgados[numero]
    return { estado: { ...estado, colgados }, pr }
  }
  const anotar = (dato) => ({ ...estado, colgados: { ...(estado.colgados ?? {}), [numero]: dato } })
  if (!previo || previo.oid !== pr.oid) return { estado: anotar({ oid: pr.oid, desde: ahora }), pr }
  if (ahora - previo.desde < COLGADO_ESPERA) return { estado, pr }
  if (previo.relanzado)
    return { estado, pr: { ...pr, arreglar: 'CI en rojo', pendiente: false, firme: true } }
  try {
    const cortadas = JSON.parse(
      gh('run', 'list', '--commit', pr.oid, '--json', 'databaseId,conclusion'),
    )
      .filter((r) => ['cancelled', 'timed_out'].includes(r.conclusion))
      .map((r) => String(r.databaseId))
    for (const id of cortadas) gh('run', 'rerun', id)
    if (cortadas.length)
      informe.push(
        `${etiqueta}: el CI de #${numero} quedó cancelado sin otra corrida detrás: lo vuelvo a correr, una vez`,
      )
  } catch (err) {
    informe.push(
      `${etiqueta}: no pude relanzar el CI cancelado de #${numero} (${String(err.message).split('\n')[0]})`,
    )
  }
  return { estado: anotar({ oid: pr.oid, desde: ahora, relanzado: true }), pr }
}
// `gh pr merge --delete-branch` borra también la rama LOCAL y, si es la de ahora, pasa ese árbol a main: el coordinador corre en el
// worktree del carril A y, al integrar el PR 80 (a/4.20-4a), dejó al A en main y su bucle paraba por «la rama no es a/…» (2026-11-08).
// La rama remota se borra por la API, sin tocar ningún worktree; si falla, queda (no impide nada).
export function integrar(numero, pr, ...modo) {
  const borrar = modo.includes('--delete-branch')
  const resto = modo.filter((m) => m !== '--delete-branch')
  gh('pr', 'merge', String(numero), ...resto, ...(pr.oid ? ['--match-head-commit', pr.oid] : []))
  if (borrar && pr.rama) {
    try {
      gh('api', '-X', 'DELETE', `repos/{owner}/{repo}/git/refs/heads/${pr.rama}`)
    } catch {
      // La rama remota queda: GitHub puede borrarla sola, y una rama vieja no bloquea a nadie.
    }
  }
}
// Un CI rojo se vuelve a correr una vez por commit (sólo los jobs que cayeron) antes de devolver el paso a su carril: un contenedor de
// Supabase que no arrancó en el runner o un e2e inestable no es un arreglo del carril (el PR 69 del 2026-11-08 volvía al A por eso).
// Devuelve el estado con el commit anotado en `reintentos` y si se pidió el reintento.
export function reintentarUnaVez(numero, pr, estado) {
  if (pr.firme) return { estado, reintentado: false }
  if (!pr.oid || estado.reintentos?.[numero] === pr.oid) return { estado, reintentado: false }
  let caidos
  try {
    caidos = JSON.parse(gh('run', 'list', '--commit', pr.oid, '--json', 'databaseId,conclusion'))
      .filter((r) => r.conclusion === 'failure')
      .map((r) => String(r.databaseId))
    for (const id of caidos) gh('run', 'rerun', id, '--failed')
  } catch {
    return { estado, reintentado: false }
  }
  if (caidos.length === 0) return { estado, reintentado: false }
  return {
    estado: { ...estado, reintentos: { ...(estado.reintentos ?? {}), [numero]: pr.oid } },
    reintentado: true,
  }
}
