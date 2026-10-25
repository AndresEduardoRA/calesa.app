// Las reglas de los workflows de GitHub Actions (`docs/DECISIONES.md`, «CI-1»), leídas por líneas: sin dependencias para parsear
// YAML. Cada función devuelve la lista de problemas en palabras; vacía es que cumple. Las prueba `workflows.test.ts`.

const SHA = /^[0-9a-f]{40}$/
const MINIMO_DE_MOTIVO = 40

// Lo que mide tiempo o necesita dos conexiones queda fuera de CI (docs/PLAN.md, 9-4 a 9-6), y el completo local corre las carreras.
// La única salvedad es `db:carreras` en el job `carreras`, que corre sólo a mano (`admitidaEnSuJob`).
const FUERA_DE_CI = [
  'db:medir',
  'medir-listado',
  'db:carreras',
  'carreras.mjs',
  'test:e2e:completo',
  'e2e-completo',
]

type Linea = { n: number; texto: string }
type Excepcion = { accion: string; motivo: string; n: number }
type Job = { nombre: string; n: number; bloque: string }

const sinComentario = (texto: string) => texto.replace(/(^|\s)#.*$/, '').trimEnd()

function lineas(texto: string): Linea[] {
  return texto.split('\n').map((t, i) => ({ n: i + 1, texto: t }))
}

const lineasDeCodigo = (texto: string): Linea[] =>
  lineas(texto).map((l) => ({ n: l.n, texto: sinComentario(l.texto) }))

// Las acciones de terceros admitidas: `# accion-de-terceros: <dueño/repo> — <motivo>`.
export function excepcionesDeTerceros(texto: string): Excepcion[] {
  const excepciones: Excepcion[] = []
  for (const { n, texto: t } of lineas(texto)) {
    const m = /^\s*#\s*accion-de-terceros:\s*(\S+)\s*(?:—|-)?\s*(.*)$/.exec(t)
    if (m) excepciones.push({ accion: m[1] ?? '', motivo: (m[2] ?? '').trim(), n })
  }
  return excepciones
}

// Los `uses:` que no son locales: la línea, la acción (dueño/repo) y la referencia.
function usosRemotos(texto: string): { n: number; uso: string; repo: string; ref: string }[] {
  const usos = []
  for (const { n, texto: t } of lineas(texto)) {
    const uso = /^\s*(?:-\s*)?uses:\s*['"]?([^'"\s#]+)/.exec(t)?.[1]
    if (!uso || uso.startsWith('./')) continue
    const [accion = '', ref = ''] = uso.split('@')
    usos.push({ n, uso, repo: accion.split('/').slice(0, 2).join('/'), ref })
  }
  return usos
}

function problemasDeExcepciones(
  excepciones: Excepcion[],
  usadas: Set<string>,
  archivo: string,
): string[] {
  const problemas: string[] = []
  for (const e of excepciones) {
    if (e.motivo.length < MINIMO_DE_MOTIVO) {
      problemas.push(
        `${archivo}:${e.n}: la excepción de ${e.accion} no dice su motivo (≥ ${MINIMO_DE_MOTIVO} caracteres)`,
      )
    }
    if (!usadas.has(e.accion)) {
      problemas.push(`${archivo}:${e.n}: la excepción de ${e.accion} no la usa ningún paso`)
    }
  }
  return problemas
}

// `uses:` de un workflow o de una acción compuesta: local, o fijada por SHA y de `actions/` (o de la lista de excepciones).
export function problemasDeAcciones(texto: string, archivo: string): string[] {
  const problemas: string[] = []
  const excepciones = excepcionesDeTerceros(texto)
  const usadas = new Set<string>()
  for (const { n, uso, repo, ref } of usosRemotos(texto)) {
    if (!SHA.test(ref)) problemas.push(`${archivo}:${n}: ${uso} no está fijada por SHA`)
    if (repo.startsWith('actions/')) continue
    if (excepciones.some((e) => e.accion === repo)) usadas.add(repo)
    else
      problemas.push(`${archivo}:${n}: ${repo} es de terceros y no está en la lista de excepciones`)
  }
  problemas.push(...problemasDeExcepciones(excepciones, usadas, archivo))
  for (const { n, texto: t } of lineasDeCodigo(texto)) {
    if (/\blatest\b/.test(t)) problemas.push(`${archivo}:${n}: «latest» no fija versión`)
  }
  return problemas
}

// Los jobs de un workflow: nombre, línea y el texto de su bloque.
export function jobsDe(texto: string): Job[] {
  const todas = lineas(texto)
  const inicio = todas.findIndex((l) => /^jobs:\s*$/.test(l.texto))
  if (inicio < 0) return []
  const resto = todas.slice(inicio + 1)
  const corte = resto.findIndex((l) => /^\S/.test(l.texto) && !l.texto.startsWith('#'))
  const cuerpo = corte < 0 ? resto : resto.slice(0, corte)
  const cabezas = cuerpo.flatMap((l, i) => {
    const nombre = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(l.texto)?.[1]
    return nombre ? [{ nombre, n: l.n, desde: i }] : []
  })
  return cabezas.map((c, k) => ({
    nombre: c.nombre,
    n: c.n,
    bloque: cuerpo
      .slice(c.desde, cabezas[k + 1]?.desde ?? cuerpo.length)
      .map((l) => l.texto)
      .join('\n'),
  }))
}

const codigoDe = (job: Job) =>
  lineasDeCodigo(job.bloque)
    .map((l) => l.texto)
    .join('\n')

// El job en el que cae la línea `n`, si cae en alguno.
function jobDeLinea(jobs: Job[], n: number): Job | undefined {
  return jobs.find((j) => n >= j.n && n < j.n + j.bloque.split('\n').length)
}

// `db:carreras` corre sólo en el job `carreras` y sólo a mano, con su input (docs/PLAN.md, 9-6: hasta 5 corridas seguidas en verde).
const JOB_DE_CARRERAS = 'carreras'
const SI_DE_CARRERAS =
  /^(?:\$\{\{\s*)?github\.event_name == 'workflow_dispatch' && inputs\.carreras(?:\s*\}\})?$/

function admitidaEnSuJob(prohibido: string, job: Job | undefined): boolean {
  if (prohibido !== 'db:carreras' || job?.nombre !== JOB_DE_CARRERAS) return false
  const si = /^ {4}if:\s*(.+?)\s*$/m.exec(codigoDe(job))?.[1] ?? ''
  return SI_DE_CARRERAS.test(si)
}

// Lo que se mira línea por línea: permisos de escritura, lo que no corre en CI y el proyecto del e2e.
function problemasPorLinea(texto: string, archivo: string): string[] {
  const problemas: string[] = []
  const jobs = jobsDe(texto)
  for (const { n, texto: t } of lineasDeCodigo(texto)) {
    if (/^\s+[a-z-]+:\s*write\b/.test(t)) problemas.push(`${archivo}:${n}: un permiso de escritura`)
    for (const prohibido of FUERA_DE_CI.filter((p) => t.includes(p))) {
      if (admitidaEnSuJob(prohibido, jobDeLinea(jobs, n))) continue
      problemas.push(`${archivo}:${n}: ${prohibido} no corre en CI`)
    }
    for (const m of t.matchAll(/--project=([A-Za-z0-9_-]*)/g)) {
      if (m[1] === 'escritorio') continue
      problemas.push(
        `${archivo}:${n}: --project=${m[1] ?? ''}: el e2e corre escritorio o ambos (input proyectos)`,
      )
    }
  }
  return problemas
}

function problemasDelJob(job: Job, archivo: string): string[] {
  const problemas: string[] = []
  const donde = `${archivo}:${job.n}: el job ${job.nombre}`
  // Sólo el código: un comentario (el que presenta al job siguiente) no cuenta como paso.
  const codigo = codigoDe(job)
  if (!/^ {4}timeout-minutes:\s*\d+\s*$/m.test(codigo)) {
    problemas.push(`${donde} no tiene timeout-minutes`)
  }
  if (codigo.includes('scripts/ci-cambios.sh') && !/fetch-depth:\s*0\b/.test(codigo)) {
    problemas.push(
      `${donde} decide por el diff y no pide fetch-depth: 0 (con un clon superficial todo es «pesado»)`,
    )
  }
  if (!codigo.includes('playwright test')) return problemas
  if (!/playwright test[^\n]*--shard=/.test(codigo)) {
    problemas.push(`${donde} corre el e2e sin bloques (--shard=)`)
  }
  if (!/E2E_COMPLETO:\s*['"]?1['"]?/.test(codigo)) {
    problemas.push(`${donde} corre el e2e sin E2E_COMPLETO=1`)
  }
  return problemas
}

// Con e2e, workflow_dispatch ofrece `proyectos` (escritorio | ambos, por defecto escritorio): el Nivel 3 a pedido.
function problemasDelInputProyectos(texto: string, archivo: string): string[] {
  if (!texto.includes('playwright test')) return []
  const entrada = /^ {6}proyectos:\s*\n((?: {8}.*\n)+)/m.exec(texto)?.[1] ?? ''
  if (
    /options:\s*\[escritorio,\s*ambos\]/.test(entrada) &&
    /default:\s*escritorio\b/.test(entrada)
  ) {
    return []
  }
  return [
    `${archivo}: workflow_dispatch necesita el input «proyectos» (escritorio | ambos, por defecto escritorio)`,
  ]
}

// Con el job `carreras`, workflow_dispatch ofrece `carreras` (boolean, por defecto false): nadie las corre sin pedirlas.
function problemasDelInputCarreras(texto: string, archivo: string, jobs: Job[]): string[] {
  if (!jobs.some((j) => j.nombre === JOB_DE_CARRERAS)) return []
  const entrada = /^ {6}carreras:\s*\n((?: {8}.*\n)+)/m.exec(texto)?.[1] ?? ''
  if (/type:\s*boolean\b/.test(entrada) && /default:\s*false\b/.test(entrada)) return []
  return [`${archivo}: workflow_dispatch necesita el input «carreras» (boolean, por defecto false)`]
}

// Un dispatch (un e2e de 70 a 96 min, unas carreras) tiene su propio grupo, con run_id, y nunca se cancela: un push a la misma
// rama no lo corta y otro dispatch no lo deja en espera. Push y pull_request cancelan a su corrida anterior.
const NO_CANCELA_EL_DISPATCH = "${{ github.event_name != 'workflow_dispatch' }}"

// `${{ github.event_name == 'workflow_dispatch' && <manual> || <el de push y PR> }}`: el manual lleva ci-manual- y run_id; el otro no.
function grupoManualAparte(grupo: string): boolean {
  const ramas =
    /^\$\{\{\s*github\.event_name == 'workflow_dispatch' && (.+?) \|\| (.+?)\s*\}\}$/.exec(grupo)
  const manual = ramas?.[1] ?? ''
  const otro = ramas?.[2] ?? ''
  return (
    manual.includes('ci-manual-') &&
    manual.includes('github.run_id') &&
    !otro.includes('ci-manual-')
  )
}

function problemasDeConcurrencia(texto: string, archivo: string): string[] {
  if (!/^ {2}workflow_dispatch:/m.test(texto)) return []
  const bloque = /^concurrency:\s*\n((?: {2}.*(?:\n|$))+)/m.exec(texto)?.[1] ?? ''
  const grupo = /^ {2}group:\s*(.+?)\s*$/m.exec(bloque)?.[1] ?? ''
  const cancela = /^ {2}cancel-in-progress:\s*(.+?)\s*$/m.exec(bloque)?.[1] ?? ''
  const problemas: string[] = []
  if (!grupoManualAparte(grupo)) {
    problemas.push(
      `${archivo}: concurrency: un workflow_dispatch necesita su propio grupo (ci-manual-… con github.run_id), distinto del de push y pull_request`,
    )
  }
  if (cancela !== NO_CANCELA_EL_DISPATCH) {
    problemas.push(
      `${archivo}: concurrency: cancel-in-progress tiene que ser ${NO_CANCELA_EL_DISPATCH} (un dispatch no se cancela; push y PR sí)`,
    )
  }
  return problemas
}

export function problemasDelWorkflow(texto: string, archivo: string): string[] {
  const problemas = problemasDeAcciones(texto, archivo)
  if (!/^permissions:\s*\n {2}contents: read\s*$/m.test(texto)) {
    problemas.push(`${archivo}: falta «permissions: contents: read» al nivel del workflow`)
  }
  problemas.push(...problemasPorLinea(texto, archivo))
  const jobs = jobsDe(texto)
  if (jobs.length === 0) problemas.push(`${archivo}: no se encontraron jobs`)
  problemas.push(...jobs.flatMap((job) => problemasDelJob(job, archivo)))
  problemas.push(...problemasDelInputProyectos(texto, archivo))
  problemas.push(...problemasDelInputCarreras(texto, archivo, jobs))
  problemas.push(...problemasDeConcurrencia(texto, archivo))
  return problemas
}

// Las funciones que exige la guardia de los e2e (`const FUNCIONES = [...]` de `e2e/soporte/guardia.ts`).
export function funcionesDeLaGuardia(texto: string): string[] {
  const lista = /const FUNCIONES = \[([^\]]*)\]/.exec(texto)?.[1] ?? ''
  return [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '')
}

// Un workflow que sirve las funciones edge espera a cada una de las que pide la guardia (`funciones="…"` y un `for … in $funciones`):
// si espera sólo a una, un bloque arranca con otra caída y la guardia lo tumba con la corrida ya pagada.
export function problemasDeEsperaDeFunciones(
  texto: string,
  archivo: string,
  funciones: string[],
): string[] {
  if (!texto.includes('functions serve')) return []
  const declaradas = /^\s*funciones="([^"]*)"\s*$/m.exec(texto)?.[1]
  if (declaradas === undefined || !/for \w+ in \$funciones\b/.test(texto)) {
    return [`${archivo}: la espera de las funciones edge no recorre funciones="…"`]
  }
  const esperadas = new Set(declaradas.split(/\s+/).filter(Boolean))
  return funciones
    .filter((f) => !esperadas.has(f))
    .map(
      (f) =>
        `${archivo}: la espera de las funciones edge no prueba ${f} (la pide e2e/soporte/guardia.ts)`,
    )
}

// Un e2e que falla no se reintenta: la causa va a e2e-fallos/ (`.claude/rules/e2e.md`).
export function problemasDePlaywright(texto: string): string[] {
  const reintentos = [...texto.matchAll(/^\s*retries:\s*(.+?),?\s*$/gm)].map((m) => m[1])
  if (reintentos.length === 1 && reintentos[0] === '0') return []
  return [
    `playwright.config.ts: tiene que decir «retries: 0» una sola vez (dice ${JSON.stringify(reintentos)})`,
  ]
}
