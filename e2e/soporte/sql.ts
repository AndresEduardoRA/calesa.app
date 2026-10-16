// SQL directo contra la base del Supabase LOCAL, como `pnpm db:medir`: con el `psql` del contenedor
// (`supabase_db_<project_id>`), sin un cliente de Postgres en las dependencias. Para sembrar volumen
// (miles de filas con `generate_series`) que por PostgREST costaría minutos. Sólo local: el contenedor
// existe sólo con `supabase start`.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function contenedor(): string {
  const toml = readFileSync('supabase/config.toml', 'utf8')
  const proyecto = /^project_id\s*=\s*"([^"]+)"/m.exec(toml)?.[1]
  if (!proyecto) {
    throw new Error('supabase/config.toml no dice el project_id.')
  }
  return `supabase_db_${proyecto}`
}

// Corre `consulta` como `postgres` y devuelve lo que imprime (`-At`: sin encabezados ni alineado).
export function sql(consulta: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      contenedor(),
      'psql',
      '-U',
      'postgres',
      '-q',
      '-X',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: consulta, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  ).trim()
}

// Un valor dentro de una consulta: entre comillas simples, con las simples duplicadas.
export const literal = (valor: string): string => `'${valor.replaceAll("'", "''")}'`
