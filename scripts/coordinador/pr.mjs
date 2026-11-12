// Lo que el coordinador le pregunta y le pide a GitHub sobre un PR (`gh`): si se puede integrar, si hay que devolverlo a su carril, si su
// CI quedó colgado, y la integración misma. Sin estado propio: el del coordinador entra y sale por parámetro. Lo usa `coordinador.mjs` ›
// `sincronizar`; se prueba, de punta a punta con un `gh` falso, en `coordinador.test.mjs`.
//
// Variables: COORD_GH (gh), COORD_GUARDAS_SOLAS, COORD_IGNORAR_CHECKS (^Vercel), COORD_ROJO_FIRME (^(Nivel 1|Carriles)),
// COORD_COLGADO_ESPERA (600 s), COORD_SUELTOS (^fix/), COORD_ENTORNO_MAX (8), COORD_ENTORNO_ESPERA (600 s), COORD_PASO_DE_PRUEBA y COORD_SENAL_DE_ENTORNO.
import { execFileSync } from 'node:child_process'
import { guardasEn } from './plan.mjs'

const GH = process.env.COORD_GH || 'gh'

// Lo que sólo lee se vuelve a pedir si GitHub falla (HTTP 499 y 5xx el 11-11-2026: «no se pudo mirar el PR» cuatro veces en una
// tarde, y cada una era otra vuelta de 3 min con el PR sin integrar): hasta COORD_GH_REINTENTOS (2) veces más, con COORD_GH_ESPERA ms
// (2000) entre una y otra. Lo que escribe (merge, rerun, api) no se repite a ciegas: lo vuelve a decidir la vuelta siguiente.
const LEE = /^(pr (view|list)|run (list|view))$/
const GH_REINTENTOS = Number(process.env.COORD_GH_REINTENTOS ?? 2)
const GH_ESPERA = Number(process.env.COORD_GH_ESPERA ?? 2000)
const pausa = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

export function gh(...args) {
  const veces = LEE.test(`${args[0]} ${args[1]}`) ? GH_REINTENTOS : 0
  for (let n = 0; ; n += 1) {
    try {
      // Con tope: `sincronizar` llama con el candado del coordinador tomado, y un `gh` colgado dejaba a los carriles sin poder pedir paso.
      return execFileSync(GH, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: Number(process.env.COORD_GH_TIMEOUT ?? 90) * 1000,
      })
    } catch (err) {
      if (n >= veces) throw err
      if (GH_ESPERA > 0) pausa(GH_ESPERA)
    }
  }
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

// ¿El prefijo `AAAAMMDDhhmmss` de una migración es una fecha y hora que existe y no es del futuro (con una hora de margen)? Es la regla de
// `scripts/guardas/orden-de-migraciones.test.ts`. Una sesión que renumera a mano sumando uno llega a `…1260` (el segundo 60 no existe;
// el 6.05 del 2026-11-11): el Nivel 1 caía y el paso volvía a su carril por algo que renumerar arregla sin sesión.
export function fechaReal(prefijo, ahora = Date.now()) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(prefijo)
  if (!m) return false
  const [a, mes, d, h, min, s] = m.slice(1).map(Number)
  const ms = Date.UTC(a, mes - 1, d, h, min, s)
  const f = new Date(ms)
  return (
    f.getUTCMonth() === mes - 1 &&
    f.getUTCDate() === d &&
    f.getUTCHours() === h &&
    f.getUTCMinutes() === min &&
    f.getUTCSeconds() === s &&
    ms <= ahora + 3_600_000
  )
}

// Las migraciones que el PR agrega y que quedaron atrás de la última de origin/main: su CI pasó contra un main más viejo, y al
// integrarlas el orden queda invertido (el #10 entró después del #11 con una versión anterior, 2026-11-06): `db push` a la demo lo
// rechaza. Vuelve a su carril, que las renumera sin sesión (carril.sh › renumerar_migraciones). Sin origin/main no se mira.
// También las que no llevan una fecha y hora reales (`fechaReal`): se arreglan igual, renumerando.
function migracionesAtrasadas(archivos) {
  const nuevas = archivos.map((a) => MIGRACION.exec(a)).filter(Boolean)
  const sinFecha = nuevas.filter((m) => !fechaReal(m[1])).map((m) => m[0])
  if (nuevas.length === 0) return { atrasadas: [], sinFecha }
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
    return { atrasadas: [], sinFecha }
  }
  const ultima =
    [...enMain]
      .map((r) => MIGRACION.exec(r)[1])
      .sort()
      .at(-1) ?? ''
  return {
    atrasadas: nuevas.filter((m) => !enMain.has(m[0]) && m[1] <= ultima).map((m) => m[0]),
    sinFecha: sinFecha.filter((r) => !enMain.has(r)),
  }
}

// Lo que dice GitHub de un PR: su estado y, si está abierto, si hay que arreglarlo, si su CI sigue y si se puede integrar.
// Se integra el commit que vio el CI y no otro (`--match-head-commit`: si el carril empujó entre medio, gh se niega y se reintenta en la
// vuelta siguiente), y un PR que toca las guardas del piloto no se integra solo: la copia del bucle sale de main y los tres carriles se
// recargan con ella (COORD_GUARDAS_SOLAS=1 lo deja).
const GUARDAS_SOLAS = process.env.COORD_GUARDAS_SOLAS === '1'
// GitHub calcula si un PR choca con main recién cuando alguien lo pregunta: la primera consulta tras cada integración contesta UNKNOWN y
// deja el cálculo andando. Con una consulta por vuelta, cada PR perdía una vuelta de 3 min después de cada integración (y otra si entre
// medio entraba otro PR): ni se integraba el que estaba en verde ni se atendía el que chocaba (el #126 del 2026-11-12, dos vueltas). Se
// vuelve a preguntar COORD_SIN_SABER_VECES (1) vez, a los COORD_SIN_SABER_ESPERA ms (2500).
const SIN_SABER_VECES = Number(process.env.COORD_SIN_SABER_VECES ?? 1)
const SIN_SABER_ESPERA = Number(process.env.COORD_SIN_SABER_ESPERA ?? 2500)
const sinSaber = (pr) =>
  pr.state === 'OPEN' && pr.mergeable !== 'MERGEABLE' && pr.mergeable !== 'CONFLICTING'

export function mirarPr(numero) {
  const leer = () =>
    JSON.parse(
      gh(
        'pr',
        'view',
        String(numero),
        '--json',
        'state,mergeable,statusCheckRollup,headRefOid,headRefName,files',
      ),
    )
  let pr = leer()
  for (let n = 0; n < SIN_SABER_VECES && sinSaber(pr); n += 1) {
    if (SIN_SABER_ESPERA > 0) pausa(SIN_SABER_ESPERA)
    try {
      pr = leer()
    } catch {
      // Vale la primera respuesta: la vuelta siguiente vuelve a mirar.
      break
    }
  }
  const checks = (pr.statusCheckRollup ?? []).filter((c) => !IGNORAR_CHECKS.test(nombreDe(c)))
  // Un estado de commit (el de Vercel: `state`, sin `status`) en PENDING o EXPECTED sigue corriendo; antes contaba como terminado y
  // rojo, y el paso volvía a su carril por un «CI en rojo» que un minuto después era verde (el PR 80, 2026-11-08).
  // Un job cancelado (lo cancela el push siguiente o su tope de tiempo) tampoco es rojo: no hubo veredicto, y el paso volvía a su
  // carril a «arreglar» un CI que no había fallado (PR 69, 2026-11-08). Queda pendiente hasta la corrida siguiente.
  // Un check con veredicto está terminado, diga lo que diga su `status`: GitHub dejó «Cambios» del #181 en IN_PROGRESS con conclusión
  // SUCCESS y hora de fin (2026-11-12), y el PR, con todo en verde, quedó «pendiente» sin que nadie lo fuera a integrar nunca.
  const estadoDe = (c) =>
    c.conclusion === 'CANCELLED'
      ? 'PENDING'
      : c.conclusion
        ? 'COMPLETED'
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
  const { atrasadas, sinFecha } =
    pr.state === 'OPEN' ? migracionesAtrasadas(archivos) : { atrasadas: [], sinFecha: [] }
  // Rojo es con el CI terminado: con un job todavía corriendo, el reintento de los caídos no se puede pedir (reintentarUnaVez). Salvo el
  // rojo firme, que no se reintenta ni espera. Una migración sin fecha real va antes que el rojo: ella sola pone el Nivel 1 en rojo
  // (orden-de-migraciones.test.ts) y se arregla renumerando, sin sesión.
  const arreglar =
    pr.mergeable === 'CONFLICTING'
      ? 'conflicto con main'
      : sinFecha.length
        ? 'migración anterior a la última de main'
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
    // El CI terminó en verde y no choca con main, falte o no renumerar: lo que `renumerar` necesita saber para no pagar otro CI.
    verde: !pendiente && !rojo && checks.length > 0 && pr.mergeable === 'MERGEABLE',
    // El CI de la punta terminó en verde, choque o no con main: lo que `unirMain` necesita saber (unir-main.mjs).
    ciVerde: !pendiente && !rojo && checks.length > 0,
    rojo,
    integrable: pr.mergeable === 'MERGEABLE',
    // GitHub todavía no calculó si choca con main (unos segundos tras cada integración): no dice que el choque de antes se fue.
    sinSaber: sinSaber(pr),
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
    // La nota se guarda mientras el commit sea el mismo: mientras corre el relanzamiento el PR no está colgado, y si se olvidara que
    // ya se relanzó, un job que siempre pasa su tope se volvería a correr sin fin. Se borra cuando el PR cambia de commit.
    if (!previo || !pr.oid || previo.oid === pr.oid) return { estado, pr }
    const colgados = { ...estado.colgados }
    delete colgados[numero]
    return { estado: { ...estado, colgados }, pr }
  }
  const anotar = (dato) => ({ ...estado, colgados: { ...(estado.colgados ?? {}), [numero]: dato } })
  if (!previo || previo.oid !== pr.oid) return { estado: anotar({ oid: pr.oid, desde: ahora }), pr }
  if (previo.relanzado)
    return { estado, pr: { ...pr, arreglar: 'CI en rojo', pendiente: false, firme: true } }
  if (ahora - previo.desde < COLGADO_ESPERA) return { estado, pr }
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
// Un rojo del entorno: cayó un paso que no es una prueba (instalar chromium, levantar la pila, bajar un artefacto) y su log trae la
// señal de una red o un runner que no respondió. No es del código: el carril no puede arreglarlo, y devolvérselo le costaba una sesión
// para descubrirlo (el 11-11-2026 apt no resolvía el espejo de Ubuntu: 7 PR en rojo, tres sesiones de opus diagnosticando lo mismo y los
// tres carriles parados esperando un arreglo). Se vuelve a correr lo que cayó hasta COORD_ENTORNO_MAX veces (8) por commit, con una
// espera que crece (COORD_ENTORNO_ESPERA s, 600, por cada vez; tope 1800), y mientras tanto el PR queda pendiente y el carril sigue con
// otro paso. Agotadas, es un rojo como cualquiera. Si no se puede mirar (gh falla), no es del entorno: lo de siempre.
const PASO_DE_PRUEBA = new RegExp(
  process.env.COORD_PASO_DE_PRUEBA ||
    '^(e2e \\(|Run (pnpm|node|npx|bash) |db:types|privilegios|splinter|next build)',
  'i',
)
const SENAL_DE_ENTORNO = new RegExp(
  process.env.COORD_SENAL_DE_ENTORNO ||
    'Temporary failure resolving|Could not resolve host|Unable to fetch some archives|EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNRESET|' +
      'TLS handshake timeout|i/o timeout|context deadline exceeded|toomanyrequests|rate limit exceeded|' +
      '50[234] (Bad Gateway|Service Unavailable|Gateway Time-?out)|No space left on device|' +
      'runner has received a shutdown signal|lost communication with the server|Failed to download (action|artifact)',
  'i',
)
const ENTORNO_MAX = Number(process.env.COORD_ENTORNO_MAX ?? 8)
const ENTORNO_ESPERA = Number(process.env.COORD_ENTORNO_ESPERA ?? 600) * 1000

/** El nombre del paso que cayó si TODAS las corridas caídas son del entorno; si no (o si no se pudo mirar), null. */
export function rojoDelEntorno(corridas) {
  let paso = null
  try {
    for (const id of corridas) {
      const jobs = (JSON.parse(gh('run', 'view', id, '--json', 'jobs')).jobs ?? []).filter(
        (j) => j.conclusion === 'failure',
      )
      if (jobs.length === 0) return null
      for (const j of jobs) {
        const caidos = (j.steps ?? []).filter((s) => s.conclusion === 'failure')
        if (caidos.length === 0 || caidos.some((s) => PASO_DE_PRUEBA.test(String(s.name))))
          return null
        paso ??= String(caidos[0].name)
      }
      const log = execFileSync(GH, ['run', 'view', id, '--log-failed'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 90_000,
        maxBuffer: 256 * 1024 * 1024,
      })
      if (!SENAL_DE_ENTORNO.test(log)) return null
    }
  } catch {
    return null
  }
  return paso
}

// Un CI rojo se vuelve a correr antes de devolver el paso a su carril (sólo los jobs que cayeron): si es del entorno, varias veces y
// espaciado (arriba); si no se sabe, una vez por commit: un contenedor de Supabase que no arrancó en el runner o un e2e inestable no es un
// arreglo del carril (el PR 69 del 2026-11-08 volvía al A por eso). Devuelve el estado (el commit en `reintentos`, la cuenta del entorno
// en `entorno`), si el PR sigue en manos del coordinador (`reintentado`) y, cuando acaba de pedir una corrida, su `aviso`.
export function reintentarUnaVez(numero, pr, estado, ahora = Date.now()) {
  if (pr.firme || !pr.oid) return { estado, reintentado: false }
  const previo = estado.entorno?.[numero]?.oid === pr.oid ? estado.entorno[numero] : null
  const yaUnaVez = estado.reintentos?.[numero] === pr.oid
  if (yaUnaVez && !previo) return { estado, reintentado: false }
  if (previo && previo.veces >= ENTORNO_MAX) return { estado, reintentado: false }
  // Entre una corrida y la siguiente se espera sin preguntarle nada a GitHub: el PR no vuelve a su carril.
  if (previo && ahora - previo.ultimo < Math.min(previo.veces * ENTORNO_ESPERA, 1_800_000))
    return { estado, reintentado: true }
  let caidos
  try {
    caidos = JSON.parse(gh('run', 'list', '--commit', pr.oid, '--json', 'databaseId,conclusion'))
      .filter((r) => r.conclusion === 'failure')
      .map((r) => String(r.databaseId))
  } catch {
    return { estado, reintentado: false }
  }
  if (caidos.length === 0) return { estado, reintentado: false }
  const paso = rojoDelEntorno(caidos)
  if (!paso && yaUnaVez) return { estado, reintentado: false }
  try {
    for (const id of caidos) gh('run', 'rerun', id, '--failed')
  } catch {
    return { estado, reintentado: false }
  }
  const veces = (previo?.veces ?? 0) + 1
  return {
    estado: {
      ...estado,
      reintentos: { ...(estado.reintentos ?? {}), [numero]: pr.oid },
      ...(paso
        ? {
            entorno: { ...(estado.entorno ?? {}), [numero]: { oid: pr.oid, veces, ultimo: ahora } },
          }
        : {}),
    },
    reintentado: true,
    aviso: paso
      ? `rojo del entorno («${paso.slice(0, 60)}»), no del código: vuelvo a correr lo que cayó (${veces} de ${ENTORNO_MAX})`
      : 'vuelvo a correr lo que cayó, una vez',
  }
}

// Los PR que no son de ningún paso: una rama `fix/…` de este mismo repo (un arreglo del flujo o del CI que abrió una sesión de
// supervisión). Antes esperaban a que esa sesión, o la persona, volviera a integrarlos: el 11-11-2026 el arreglo del CI estuvo listo y sin
// entrar mientras los tres carriles lo esperaban. Con el CI en verde los integra el coordinador, como un paso (squash y sin rama); un
// rojo se vuelve a correr como cualquiera y, si sigue, queda a la vista en GitHub. Nunca un PR de un fork ni un borrador.
// COORD_SUELTOS es la expresión de la rama (`^fix/`); vacía, lo apaga.
const SUELTOS = process.env.COORD_SUELTOS ?? '^fix/'
export function integrarSueltos(estado, informe) {
  if (!SUELTOS) return estado
  const rama = new RegExp(SUELTOS)
  let abiertos
  try {
    abiertos = JSON.parse(
      gh('pr', 'list', '--state', 'open', '--json', 'number,headRefName,isCrossRepository,isDraft'),
    )
  } catch {
    return estado
  }
  for (const a of abiertos) {
    if (a.isCrossRepository !== false || a.isDraft || !rama.test(a.headRefName ?? '')) continue
    const etiqueta = `#${a.number} (${a.headRefName})`
    let pr
    try {
      pr = mirarPr(a.number)
    } catch {
      continue
    }
    ;({ estado, pr } = atenderColgado(a.number, pr, estado, informe, etiqueta))
    if (pr.arreglar === 'CI en rojo') {
      const r = reintentarUnaVez(a.number, pr, estado)
      estado = r.estado
      if (r.aviso) informe.push(`${etiqueta}: CI en rojo: ${r.aviso}`)
      continue
    }
    if (!pr.listo) continue
    if (pr.guardas.length) {
      informe.push(`${etiqueta}: toca las guardas del piloto: lo integra la persona`)
      continue
    }
    try {
      integrar(a.number, pr, '--squash', '--delete-branch')
      informe.push(`${etiqueta}: integrado por el coordinador`)
    } catch (err) {
      informe.push(`${etiqueta}: no se pudo integrar (${String(err.message).split('\n')[0]})`)
    }
  }
  return estado
}
