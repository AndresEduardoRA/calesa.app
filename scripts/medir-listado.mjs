// Corre las mediciones de `supabase/tests/medir-*.sql` (las de `MEDICIONES`) contra la base del Supabase LOCAL y
// resume la mediana de cada consulta. No hay `psql` en el equipo ni un cliente de Postgres en las dependencias: se usa el
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
const MEDICIONES = [
  ['supabase/tests/medir-listado.sql', 'Listado de leads, 2.000 leads sintéticos'],
  [
    'supabase/tests/medir-embudo.sql',
    'Kanban de oportunidades, 2.000 leads y 10.000 oportunidades',
  ],
  [
    'supabase/tests/medir-importacion.sql',
    'Importación de leads, 500 filas en lotes de 50 sobre 22.000 filas de actividad',
  ],
  [
    'supabase/tests/medir-volumen.sql',
    'Listas de un lead, 20.000 seguimientos y 5.000 recordatorios (con la forma del plan asertada)',
  ],
]

for (const [archivo, titulo] of MEDICIONES) {
  const sql = readFileSync(archivo, 'utf8')
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
        : `No se pudo medir ${archivo}: la base rechazó la medición (arriba, el motivo).`,
    )
    process.exit(1)
  }

  const medidas = [...corrida.stderr.matchAll(/medicion\|([^|]+)\|([\d.]+)/g)].map((m) => ({
    consulta: m[1],
    ms: Number(m[2]),
  }))
  if (medidas.length === 0) {
    console.error(corrida.stderr)
    console.error(`La medición de ${archivo} no informó nada.`)
    process.exit(1)
  }
  const ancho = Math.max(...medidas.map((m) => m.consulta.length))
  console.log(`${titulo} (mediana de 5 corridas, ms):`)
  for (const { consulta, ms } of medidas) {
    console.log(`  ${consulta.padEnd(ancho)}  ${ms.toFixed(1).padStart(7)}`)
  }
}
