// Siembra volumen para medir y mirar la app (9e): 50.000 leads, 10.000 vehículos, 200.000
// seguimientos, etc. (`supabase/tests/volumen/sembrar.sql`). Sólo contra el Supabase LOCAL, con el
// `psql` del contenedor de la base. Fuera de la suite y de `db:reset`. Después: `pnpm db:reset`.
// Uso: pnpm db:sembrar-volumen                      (50.000 leads, lo que mide `db:medir:volumen`)
//      pnpm db:sembrar-volumen -- --leads 200000    (otra cantidad, con el mismo reparto: para medir una vez y anotar)
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const toml = readFileSync('supabase/config.toml', 'utf8')
const proyecto = /^project_id\s*=\s*"([^"]+)"/m.exec(toml)?.[1]
if (!proyecto) {
  console.error('supabase/config.toml no dice el project_id.')
  process.exit(1)
}
const contenedor = `supabase_db_${proyecto}`
const posicion = process.argv.indexOf('--leads')
const leads = posicion === -1 ? 50000 : Number(process.argv[posicion + 1])
if (!Number.isInteger(leads) || leads < 50000 || leads > 1000000) {
  console.error('--leads tiene que ser un entero entre 50000 y 1000000.')
  process.exit(1)
}
const inicio = Date.now()
const corrida = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    contenedor,
    'psql',
    '-U',
    'postgres',
    '-q',
    '-X',
    '-At',
    '-v',
    'ON_ERROR_STOP=1',
    '-v',
    `n=${String(leads)}`,
  ],
  {
    input: readFileSync('supabase/tests/volumen/sembrar.sql', 'utf8'),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  },
)
if (corrida.error || corrida.status !== 0) {
  console.error(corrida.error?.message ?? corrida.stderr)
  console.error(
    corrida.error
      ? `No se pudo sembrar: ¿está arriba el Supabase local (${contenedor})?`
      : 'La base rechazó la siembra (arriba, el motivo).',
  )
  process.exit(1)
}
console.log(corrida.stdout.trim())

// Lo que deja la siembra masiva, como lo dejaría un uso largo (5a-37). `vacuum (analyze)` de todo lo sembrado: sin él, el mapa de visibilidad y las
// estadísticas de lo recién insertado no existen. Y `reindex` del GIN de la búsqueda (`leads_busqueda_idx`): lo que dejan 200.000 altas con la lista
// pendiente es un índice con otra estructura, que lee los mismos buffers y tarda 3 veces más (la dueña, «Volumen 4999», 34 contra 10 ms con 212.000 leads) hasta
// que el primer volcado de esa lista, que hace la propia medición, lo reordena: la primera corrida de `db:medir:volumen` fallaba y la segunda pasaba sin
// que nada cambiara. Un `vacuum` no lo arregla (medido el 2026-10-22). Un `reindex` lo deja siempre como el estado de la segunda corrida.
const TABLAS_SEMBRADAS = [
  'leads',
  'leads_asesores',
  'leads_numeros_globales',
  'leads_numeros_propios',
  'leads_tachados',
  'leads_favoritos',
  'leads_etiquetas',
  'etiquetas',
  'seguimientos',
  'recordatorios',
  'oportunidades',
  'vehiculos',
  'lotes_papelera',
  'importaciones',
  'importaciones_leads',
]
const limpieza = spawnSync(
  'docker',
  [
    'exec',
    contenedor,
    'psql',
    '-U',
    'postgres',
    '-q',
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    ...TABLAS_SEMBRADAS.flatMap((tabla) => ['-c', `vacuum (analyze) public.${tabla}`]),
    '-c',
    'reindex index public.leads_busqueda_idx',
    '-c',
    'analyze public.leads',
  ],
  { encoding: 'utf8' },
)
if (limpieza.error || limpieza.status !== 0) {
  console.error(limpieza.error?.message ?? limpieza.stderr)
  console.error(
    'La siembra quedó hecha, pero no se pudo dejar la base como en uso (vacuum y reindex).',
  )
  process.exit(1)
}
console.log(`Sembrado en ${((Date.now() - inicio) / 1000).toFixed(0)} s.`)
console.log(
  'Cuentas: duena-volumen@ejemplo.com y ana-volumen@ejemplo.com, clave «Volumen-9e-clave».',
)
console.log('Al terminar de medir y mirar: pnpm db:reset.')
