// Los e2e que corre un PR en CI (el Nivel 1 de `.claude/rules/e2e.md`, en CI): el completo si el cambio toca un disparador del
// Nivel 2 (`scripts/piloto/nivel.mjs`) o algo que mueve a todos los specs; si no, los dirigidos a lo tocado; ninguno si no hay qué.
// El completo de cada noche (`.github/workflows/ci.yml`, `schedule`) cubre lo que esta elección deje afuera.
//
//   node scripts/e2e-dirigidos.mjs --rango <base>...<head> [--github]   → JSON por stdout, o las líneas de $GITHUB_OUTPUT
//
// Un spec es dirigido si: cambió él; importa un `e2e/soporte/<x>` o un `e2e/fixtures/<x>` que cambió; o nombra lo tocado: el módulo
// `src/modules/<m>/` (su nombre al empezar el del spec, `modules/<m>/` o la ruta `/<m>` en su texto), la ruta `src/app/(app)/<r>/`
// (`/<r>`) o la función edge `supabase/functions/<f>/` (su nombre). Un archivo de `src/` que no lleva a ningún spec pide el completo:
// mejor sobrar que faltar. Se prueba en `e2e-dirigidos.test.ts`.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'

import { nivelDe } from './piloto/nivel.mjs'

// Lo que mueve a todos los specs a la vez: la configuración del runner, las dependencias y la base (migraciones y semillas).
const MUEVE_TODO = [
  /^playwright\.config\.ts$/,
  /^e2e\/global-setup\.ts$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^next\.config\.ts$/,
  /^supabase\/(migrations|semillas)\//,
  /^supabase\/(seed\.sql|config\.toml)$/,
]

const esSpec = (a) => /^e2e\/[^/]+\.spec\.ts$/.test(a)
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Lo que nombra a un ayudante de `e2e/soporte/` (`soporte/<nombre>`) o a un archivo de `e2e/fixtures/` (`fixtures/<carpeta>`).
const patronDeSoporte = (archivo) => {
  const [, carpeta, resto] =
    /^e2e\/(soporte|fixtures)\/(.+?)(?:\.[cm]?[jt]sx?)?$/.exec(archivo) ?? []
  if (!carpeta || !resto) return null
  const nombre = carpeta === 'fixtures' ? (resto.split('/')[0] ?? resto) : resto
  return new RegExp(`${carpeta}/${escapar(nombre)}\\b`)
}

// Los ayudantes de `e2e/soporte/` que cambiaron y los que los importan, hasta cerrar: un spec que usa `pasos.ts`, que usa `base.ts`,
// depende de `base.ts`.
function soporteAfectado(archivos, leer, todosLosSoportes) {
  const afectados = new Set(archivos.filter((a) => /^e2e\/(soporte|fixtures)\//.test(a)))
  for (let cambio = true; cambio;) {
    cambio = false
    for (const soporte of todosLosSoportes) {
      if (afectados.has(soporte)) continue
      const texto = leer(soporte) ?? ''
      if (
        [...afectados].some((a) => patronDeSoporte(a)?.test(texto) || patronLocal(a)?.test(texto))
      ) {
        afectados.add(soporte)
        cambio = true
      }
    }
  }
  return [...afectados]
}

// Entre ayudantes el import es relativo (`./base`): el nombre del archivo basta.
const patronLocal = (archivo) => {
  const nombre = /^e2e\/soporte\/(.+?)(?:\.[cm]?[jt]sx?)?$/.exec(archivo)?.[1]
  return nombre ? new RegExp(`['"\`]\\./${escapar(nombre)}(?:\\.[cm]?[jt]sx?)?['"\`]`) : null
}

/** Lo que un archivo tocado busca en los specs, o null si no lleva a ninguno por sí mismo (docs, scripts, pruebas de Vitest…). */
function claveDe(archivo) {
  if (/^e2e\/(soporte|fixtures)\//.test(archivo)) return null
  const modulo = /^src\/modules\/([^/]+)\//.exec(archivo)?.[1]
  if (modulo) {
    return {
      tipo: 'nombra',
      prefijo: modulo,
      patron: new RegExp(`modules/${escapar(modulo)}/|['"\`]/${escapar(modulo)}\\b`),
    }
  }
  const ruta = /^src\/app\/\(app\)\/([^/_()][^/]*)\//.exec(archivo)?.[1]
  if (ruta)
    return { tipo: 'nombra', prefijo: ruta, patron: new RegExp(`['"\`]/${escapar(ruta)}\\b`) }
  const funcion = /^supabase\/functions\/([^/_][^/]*)\//.exec(archivo)?.[1]
  if (funcion)
    return { tipo: 'nombra', prefijo: funcion, patron: new RegExp(`\\b${escapar(funcion)}\\b`) }
  return null
}

/**
 * La elección para un conjunto de archivos tocados. `specs`: los nombres `e2e/<x>.spec.ts` que existen en la cabeza del PR;
 * `leer(archivo)`: el contenido en esa cabeza, o null si ya no existe. Puro: sin I/O.
 */
export function e2eDelCambio(archivos, specs, leer, soportes = []) {
  const nivel = nivelDe(archivos, leer)
  if (nivel.nivel === 2) {
    return {
      modo: 'completo',
      motivo: `Nivel 2: ${nivel.disparadores.map((d) => d.id).join(', ')}`,
      specs: [],
      interfaz: nivel.toca_interfaz,
    }
  }
  const todo = archivos.filter((a) => MUEVE_TODO.some((p) => p.test(a)))
  if (todo.length > 0)
    return {
      modo: 'completo',
      motivo: `mueve a todos: ${todo.join(', ')}`,
      specs: [],
      interfaz: nivel.toca_interfaz,
    }

  const elegidos = new Set(archivos.filter((a) => esSpec(a) && specs.includes(a)))
  for (const ayudante of soporteAfectado(archivos, leer, soportes)) {
    const patron = patronDeSoporte(ayudante)
    for (const spec of specs) if (patron?.test(leer(spec) ?? '')) elegidos.add(spec)
  }
  const huerfanos = []
  for (const archivo of archivos) {
    // Un spec ya está elegido; una prueba de Vitest la cubre `pnpm test`.
    if (esSpec(archivo) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(archivo)) continue
    const clave = claveDe(archivo)
    if (!clave) {
      if (archivo.startsWith('src/')) huerfanos.push(archivo)
      continue
    }
    const llega = specs.filter((spec) => {
      if (clave.tipo === 'nombra' && basename(spec).startsWith(clave.prefijo)) return true
      return clave.patron.test(leer(spec) ?? '')
    })
    if (llega.length === 0 && archivo.startsWith('src/')) huerfanos.push(archivo)
    for (const spec of llega) elegidos.add(spec)
  }
  if (huerfanos.length > 0) {
    return {
      modo: 'completo',
      motivo: `sin spec que los nombre: ${huerfanos.join(', ')}`,
      specs: [],
      interfaz: nivel.toca_interfaz,
    }
  }
  const lista = [...elegidos].sort()
  if (lista.length === 0)
    return { modo: 'ninguno', motivo: 'nada que toque la app', specs: [], interfaz: false }
  return {
    modo: 'dirigidos',
    motivo: `${String(lista.length)} specs de lo tocado`,
    specs: lista,
    interfaz: nivel.toca_interfaz,
  }
}

/** Las líneas de $GITHUB_OUTPUT: el modo, los specs, los bloques de la matriz (1 dirigido, 4 completo) y los proyectos. */
export function salidaDeGithub(eleccion) {
  const completo = eleccion.modo === 'completo'
  return [
    `e2e_modo=${eleccion.modo}`,
    `e2e_specs=${eleccion.specs.join(' ')}`,
    `e2e_bloques=${completo ? '[1,2,3,4]' : '[1]'}`,
    `e2e_de=${completo ? '4' : '1'}`,
    // El completo de un PR es el del Nivel 2 (escritorio); lo dirigido va también en móvil si toca interfaz (el Nivel 1).
    `e2e_proyectos=${!completo && eleccion.interfaz ? 'ambos' : 'escritorio'}`,
  ].join('\n')
}

function principal(argv) {
  const i = argv.indexOf('--rango')
  const rango = argv[i + 1]
  if (i < 0 || !rango)
    throw new Error('uso: node scripts/e2e-dirigidos.mjs --rango <base>...<head> [--github]')
  const git = (...args) =>
    execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const cabeza = rango.split(/\.{2,3}/).pop() || 'HEAD'
  const archivos = git('diff', '--name-only', rango).split('\n').filter(Boolean)
  const specs = readdirSync('e2e')
    .filter((f) => f.endsWith('.spec.ts'))
    .map((f) => `e2e/${f}`)
  const soportes = readdirSync('e2e/soporte').map((f) => `e2e/soporte/${f}`)
  const leer = (a) => {
    try {
      return cabeza === 'HEAD' ? readFileSync(a, 'utf8') : git('show', `${cabeza}:${a}`)
    } catch {
      return null
    }
  }
  const eleccion = e2eDelCambio(archivos, specs, leer, soportes)
  console.error(`e2e: ${eleccion.modo} (${eleccion.motivo})`)
  console.log(argv.includes('--github') ? salidaDeGithub(eleccion) : JSON.stringify(eleccion))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2))
}
