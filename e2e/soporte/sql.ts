// SQL directo contra la base del Supabase LOCAL, como `pnpm db:medir`: con el `psql` del contenedor
// (`supabase_db_<project_id>`), sin un cliente de Postgres en las dependencias. Para sembrar volumen
// (miles de filas con `generate_series`) que por PostgREST costaría minutos. Sólo local: el contenedor
// existe sólo con `supabase start`.
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

function contenedor(): string {
  const toml = readFileSync('supabase/config.toml', 'utf8')
  const proyecto = /^project_id\s*=\s*"([^"]+)"/m.exec(toml)?.[1]
  if (!proyecto) {
    throw new Error('supabase/config.toml no dice el project_id.')
  }
  return `supabase_db_${proyecto}`
}

const psql = () => [
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
]

// Corre `consulta` como `postgres` y devuelve lo que imprime (`-At`: sin encabezados ni alineado).
export function sql(consulta: string): string {
  return execFileSync('docker', psql(), {
    input: consulta,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }).trim()
}

const RETENIDO = 'e2e-retenido'

// Abre una transacción, corre `consulta` (un `select … for update`) y la deja abierta con sus locks hasta `soltar()`, que la
// revierte. Resuelve cuando la consulta ya terminó: lo que toma está tomado. Para un estado que otra transacción no puede
// cerrar (5a-32: un lead de una baja en curso que el lote salta con `skip locked`, así que el job no la termina).
export async function retener(consulta: string): Promise<{ soltar: () => Promise<void> }> {
  const proceso = spawn('docker', psql(), { stdio: ['pipe', 'pipe', 'pipe'] })
  const cerrado = new Promise<void>((resolver) => proceso.on('close', () => resolver()))
  let salida = ''
  let errores = ''
  proceso.stderr.on('data', (dato: Buffer) => (errores += dato.toString()))
  await new Promise<void>((resolver, rechazar) => {
    proceso.stdout.on('data', (dato: Buffer) => {
      salida += dato.toString()
      if (salida.includes(RETENIDO)) {
        resolver()
      }
    })
    void cerrado.then(() =>
      rechazar(new Error(`retener: psql terminó antes de tomar los locks. ${errores}`)),
    )
    proceso.stdin.write(`begin;\n${consulta};\n\\echo ${RETENIDO}\n`)
  })
  return {
    soltar: async () => {
      proceso.stdin.end('rollback;\n')
      await cerrado
    },
  }
}

// Un valor dentro de una consulta: entre comillas simples, con las simples duplicadas.
export const literal = (valor: string): string => `'${valor.replaceAll("'", "''")}'`
