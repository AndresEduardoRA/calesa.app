// El nivel de verificación de un conjunto de archivos (`.claude/rules/e2e.md`): Nivel 2 si toca alguno de los SEIS disparadores y
// ningún otro, Nivel 1 si no. Además informa, aparte, si cambió `database.types.ts` (no es un disparador de `src/shared`) y si el
// conjunto toca interfaz: sólo entonces los e2e dirigidos corren también en `movil` (si no, sólo en `escritorio`).
//
// Uso: node scripts/piloto/nivel.mjs [--rango <a>..<b>] [archivo…]   → JSON por stdout
//   --rango lee los archivos de `git diff --name-only` y el contenido de las migraciones de `<b>`; sin él, del árbol de trabajo.
// Se prueba en `nivel.test.ts`.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const TIPOS = 'src/shared/types/database.types.ts'
const empieza = (archivo, ...prefijos) => prefijos.some((p) => archivo.startsWith(p))

// SQL sin sus comentarios: una policy nombrada en un `--` no es una policy.
const sinComentarios = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ')
const cambiaRls = (sql) =>
  sql !== null &&
  /\b(create|alter|drop)\s+policy\b|\benable\s+row\s+level\s+security\b/i.test(sinComentarios(sql))
// La estructura: una migración que crea, cambia o borra una tabla o un índice (la base aplastada no cambia nunca: lo que cambia la
// estructura es una migración nueva).
const cambiaEstructura = (sql) =>
  sql !== null &&
  /\b(create|alter|drop)\s+table\b|\b(create|drop)\s+(unique\s+)?index\b/i.test(sinComentarios(sql))

// El orden es el de la regla: (1) lo compartido … (6) la estructura.
const DISPARADORES = [
  { id: 'shared', aplica: (a) => a.startsWith('src/shared/') && a !== TIPOS },
  { id: 'proxy', aplica: (a) => a === 'src/proxy.ts' },
  {
    id: 'auth',
    aplica: (a) =>
      empieza(a, 'src/modules/equipo/features/auth/', 'src/app/auth/', 'src/app/(acceso)/'),
  },
  {
    id: 'rls',
    aplica: (a, leer) => /^supabase\/migrations\/[^/]+\.sql$/.test(a) && cambiaRls(leer(a)),
  },
  {
    id: 'layout',
    aplica: (a) =>
      a === 'src/app/layout.tsx' ||
      a === 'src/app/(app)/layout.tsx' ||
      a === 'src/app/(acceso)/layout.tsx' ||
      a.startsWith('src/app/(app)/_shell/'),
  },
  {
    id: 'estructura',
    aplica: (a, leer) => /^supabase\/migrations\/[^/]+\.sql$/.test(a) && cambiaEstructura(leer(a)),
  },
]

// Interfaz: la regla está escrita en un solo lugar, `.claude/rules/e2e.md` › «Interfaz: cuándo los e2e dirigidos corren también en
// `movil`». Aquí sólo se aplica; si una cambia, la otra también (`nivel.test.ts` falla si la lista de la regla y ésta se separan).
const esPrueba = (a) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(a)
const tocaInterfaz = (a) =>
  !esPrueba(a) &&
  (/^src\/.*\.(tsx|css)$/.test(a) ||
    empieza(a, 'design/', 'public/', 'src/app/', 'src/shared/ui/') ||
    /^src\/modules\/[^/]+\/pantallas\//.test(a))

/** `leer(archivo)` devuelve el contenido, o null si el archivo ya no existe. */
export function nivelDe(archivos, leer) {
  const disparadores = DISPARADORES.map(({ id, aplica }) => ({
    id,
    archivos: archivos.filter((a) => aplica(a, leer)),
  })).filter((d) => d.archivos.length > 0)
  const interfaz = archivos.filter(tocaInterfaz)
  return {
    nivel: disparadores.length > 0 ? 2 : 1,
    disparadores,
    toca_interfaz: interfaz.length > 0,
    interfaz,
    database_types: archivos.includes(TIPOS),
    archivos,
  }
}

function main(argv) {
  const i = argv.indexOf('--rango')
  const rango = i >= 0 ? argv[i + 1] : undefined
  // Sin --rango todos los argumentos son archivos (con i = -1, `k !== i + 1` descartaba el primero).
  const archivos = i >= 0 ? argv.filter((_, k) => k !== i && k !== i + 1) : argv
  if (rango === undefined) {
    const leer = (a) => {
      try {
        return readFileSync(a, 'utf8')
      } catch {
        return null
      }
    }
    return nivelDe(archivos, leer)
  }
  const git = (...args) =>
    execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const fin = rango.split('..').pop()
  const cambiados = git('diff', '--name-only', rango).split('\n').filter(Boolean)
  const leer = (a) => {
    try {
      return git('show', `${fin}:${a}`)
    } catch {
      return null
    }
  }
  return nivelDe([...cambiados, ...archivos], leer)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(main(process.argv.slice(2))))
}
