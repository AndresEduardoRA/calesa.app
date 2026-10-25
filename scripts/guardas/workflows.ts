// Las reglas de los workflows de GitHub Actions (`docs/DECISIONES.md`, «CI-1»), leídas por líneas: sin dependencias para parsear
// YAML. Cada función devuelve la lista de problemas en palabras; vacía es que cumple. Las prueba `workflows.test.ts`.

const SHA = /^[0-9a-f]{40}$/
const MINIMO_DE_MOTIVO = 40

// Lo que mide tiempo o necesita dos conexiones queda fuera de CI (docs/PLAN.md, 9-4 a 9-6), y el completo local corre las carreras.
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

// Lo que se mira línea por línea: permisos de escritura, lo que no corre en CI y el proyecto del e2e.
function problemasPorLinea(texto: string, archivo: string): string[] {
  const problemas: string[] = []
  for (const { n, texto: t } of lineasDeCodigo(texto)) {
    if (/^\s+[a-z-]+:\s*write\b/.test(t)) problemas.push(`${archivo}:${n}: un permiso de escritura`)
    for (const prohibido of FUERA_DE_CI.filter((p) => t.includes(p))) {
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
  const codigo = lineasDeCodigo(job.bloque)
    .map((l) => l.texto)
    .join('\n')
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
  return problemas
}

// Un e2e que falla no se reintenta: la causa va a e2e-fallos/ (`.claude/rules/e2e.md`).
export function problemasDePlaywright(texto: string): string[] {
  const reintentos = [...texto.matchAll(/^\s*retries:\s*(.+?),?\s*$/gm)].map((m) => m[1])
  if (reintentos.length === 1 && reintentos[0] === '0') return []
  return [
    `playwright.config.ts: tiene que decir «retries: 0» una sola vez (dice ${JSON.stringify(reintentos)})`,
  ]
}
