// Corre `supabase/tests/medir-listado.sql` contra la base del Supabase LOCAL y resume la mediana de
// cada consulta. No hay `psql` en el equipo ni un cliente de Postgres en las dependencias: se usa el
// del contenedor de la base (`supabase_db_<project_id>`). La medición va en una transacción que se
// revierte: no deja filas (sí huecos en la numeración de leads y actividad).
// Uso: pnpm db:medir
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const toml = readFileSync('supabase/config.toml', 'utf8')
const proyecto = /^project_id\s*=\s*"([^"]+)"/m.exec(toml)?.[1]
if (!proyecto) {
  console.error('supabase/config.toml no dice el project_id.')
  process.exit(1)
}
const contenedor = `supabase_db_${proyecto}`
const sql = readFileSync('supabase/tests/medir-listado.sql', 'utf8')

const corrida = spawnSync(
  'docker',
  ['exec', '-i', contenedor, 'psql', '-U', 'postgres', '-q', '-X', '-v', 'ON_ERROR_STOP=1'],
  { input: sql, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
)
if (corrida.error || corrida.status !== 0) {
  console.error(corrida.error?.message ?? corrida.stderr)
  console.error(
    corrida.error
      ? `No se pudo medir: ¿está arriba el Supabase local (${contenedor})?`
      : 'No se pudo medir: la base rechazó la medición (arriba, el motivo).',
  )
  process.exit(1)
}

const medidas = [...corrida.stderr.matchAll(/medicion\|([^|]+)\|([\d.]+)/g)].map((m) => ({
  consulta: m[1],
  ms: Number(m[2]),
}))
if (medidas.length === 0) {
  console.error(corrida.stderr)
  console.error('La medición no informó nada.')
  process.exit(1)
}
const ancho = Math.max(...medidas.map((m) => m.consulta.length))
console.log('Listado de leads, 2.000 leads sintéticos (mediana de 5 corridas, ms):')
for (const { consulta, ms } of medidas) {
  console.log(`  ${consulta.padEnd(ancho)}  ${ms.toFixed(1).padStart(7)}`)
}
