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
console.log(`Sembrado en ${((Date.now() - inicio) / 1000).toFixed(0)} s.`)
console.log(
  'Cuentas: duena-volumen@ejemplo.com y ana-volumen@ejemplo.com, clave «Volumen-9e-clave».',
)
console.log('Al terminar de medir y mirar: pnpm db:reset.')
