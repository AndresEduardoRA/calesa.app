// Corre las mediciones de `supabase/tests/medir-*.sql` (las de `MEDICIONES`) contra la base del Supabase LOCAL y
// resume la mediana de cada consulta. No hay `psql` en el equipo ni un cliente de Postgres en las dependencias: se usa el
// del contenedor de la base (`supabase_db_<project_id>`). La medición va en una transacción que se
// revierte: no deja filas (sí huecos en la numeración de leads y actividad).
// Uso: pnpm db:medir          (la base de la semilla)
//      pnpm db:medir:volumen  (tras pnpm db:sembrar-volumen; después pnpm db:reset)
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const toml = readFileSync('supabase/config.toml', 'utf8')
const proyecto = /^project_id\s*=\s*"([^"]+)"/m.exec(toml)?.[1]
if (!proyecto) {
  console.error('supabase/config.toml no dice el project_id.')
  process.exit(1)
}
const contenedor = `supabase_db_${proyecto}`
const CON_VOLUMEN = process.argv.includes('--volumen')

// Los tamaños de página salen del código, no del SQL (9g): `medir-escala.sql` los recibe como variables de psql. Si una
// constante cambia de nombre o de forma, esto falla en vez de medir con un número viejo.
function constante(archivo, nombre) {
  const fuente = readFileSync(archivo, 'utf8')
  const coincide = new RegExp(`export const ${nombre}(?::[^=]+)? = (\\d+)\\b`).exec(fuente)
  if (!coincide) {
    console.error(`No encontré «export const ${nombre} = <número>» en ${archivo}.`)
    process.exit(1)
  }
  return Number(coincide[1])
}
function tamanosDelSelector() {
  const fuente = readFileSync('src/shared/lib/paginacion.ts', 'utf8')
  const lista = /export const TAMANOS_DE_PAGINA = \[([\d,\s]+)\]/.exec(fuente)?.[1]
  if (!lista) {
    console.error('No encontré TAMANOS_DE_PAGINA en src/shared/lib/paginacion.ts.')
    process.exit(1)
  }
  return lista.split(',').map((n) => Number(n.trim()))
}
// El máximo de cada lista con selector es lo que declara su módulo, acotado a lo que el selector ofrece.
const TAMANOS = tamanosDelSelector()
const maximoDe = (declarado) => Math.max(...TAMANOS.filter((t) => t <= declarado))
const VARIABLES_DE_PAGINA = {
  max_leads: maximoDe(
    constante('src/modules/leads/entities/listado.ts', 'MAXIMO_DE_PAGINA_DE_LEADS'),
  ),
  max_vehiculos: maximoDe(
    constante('src/modules/vehiculos/entities/vehiculo.ts', 'MAXIMO_DE_PAGINA_DE_VEHICULOS'),
  ),
  tam_columna: constante('src/shared/lib/paginacion.ts', 'TAMANO_DE_COLUMNA'),
  tope_cargado: constante('src/shared/lib/paginacion.ts', 'TOPE_DE_LO_CARGADO'),
  lotes: constante('src/shared/lib/paginacion.ts', 'LOTES_POR_PAGINA'),
  ver_mas: constante('src/shared/lib/paginacion.ts', 'TAMANO_DE_VER_MAS'),
}
const ARGUMENTOS_DE_PSQL = Object.entries(VARIABLES_DE_PAGINA).flatMap(([nombre, valor]) => [
  '-v',
  `${nombre}=${String(valor)}`,
])
const MEDICIONES_BASE = [
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
// Las que necesitan el volumen de `pnpm db:sembrar-volumen` (50.000 leads…): aparte, porque la base de
// la semilla no lo tiene. `pnpm db:medir:volumen`; después, `pnpm db:reset`.
const MEDICIONES_CON_VOLUMEN = [
  [
    'supabase/tests/medir-escala.sql',
    'Escala de toda la app, 50.000 leads (dueña «todos» y Ana «propios»)',
  ],
  ['supabase/tests/medir-jobs.sql', 'Los jobs con 100.000 filas por purgar (ms por corrida)'],
]
const MEDICIONES = CON_VOLUMEN ? MEDICIONES_CON_VOLUMEN : MEDICIONES_BASE

console.log(`Tamaños de página (del código): ${JSON.stringify(VARIABLES_DE_PAGINA)}`)
for (const [archivo, titulo] of MEDICIONES) {
  const sql = readFileSync(archivo, 'utf8')
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
      '-v',
      'ON_ERROR_STOP=1',
      ...ARGUMENTOS_DE_PSQL,
    ],
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
