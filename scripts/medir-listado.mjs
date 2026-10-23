// Corre las mediciones de `supabase/tests/medir-*.sql` (las de `MEDICIONES`) contra la base del Supabase LOCAL y
// resume la mediana de cada consulta. No hay `psql` en el equipo ni un cliente de Postgres en las dependencias: se usa el
// del contenedor de la base (`supabase_db_<project_id>`). La medición va en una transacción que se
// revierte: no deja filas (sí huecos en la numeración de leads y actividad).
// Uso: pnpm db:medir          (la base de la semilla)
//      pnpm db:medir:volumen  (tras pnpm db:sembrar-volumen; después pnpm db:reset)
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { loadavg } from 'node:os'

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
  tope_equipo: constante('src/shared/lib/paginacion.ts', 'TOPE_DEL_EQUIPO'),
  ver_mas: constante('src/shared/lib/paginacion.ts', 'TAMANO_DE_VER_MAS'),
  // El conteo de los tachados ocultos y el de la exportación por la ventana de candidatos (4.03, 5a-34): sus topes y cuántos candidatos espera cada ventana (cuántas ventanas alcanzan).
  tope_ocultos: constante('src/modules/leads/entities/filtros-de-marcas.ts', 'TOPE_DE_OCULTOS'),
  tope_exportacion: constante('src/modules/leads/entities/exportacion.ts', 'TOPE_DE_EXPORTACION'),
  por_ventana: constante(
    'src/modules/leads/entities/candidatos.ts',
    'CANDIDATOS_POR_VENTANA_ESPERADOS',
  ),
  // El lote de la importación de leads (`medir-importacion.sql`): su tope vive en un solo punto del código.
  lote: constante('src/modules/leads/entities/importacion/limites.ts', 'FILAS_POR_LOTE'),
}
const ARGUMENTOS_DE_PSQL = Object.entries(VARIABLES_DE_PAGINA).flatMap(([nombre, valor]) => [
  '-v',
  `${nombre}=${String(valor)}`,
])
// Cada medición dice cuántas corridas hay detrás de su número: la mediana de 5 (las consultas) o una sola (la importación, los jobs y la
// baja: gastan lo que miden, no se repiten).
const MEDIANA = 'mediana de 5 corridas'
const UNA = 'una corrida'
const MEDICIONES_BASE = [
  ['supabase/tests/medir-listado.sql', 'Listado de leads, 2.000 leads sintéticos', MEDIANA],
  [
    'supabase/tests/medir-embudo.sql',
    'Kanban de oportunidades, 2.000 leads y 10.000 oportunidades',
    MEDIANA,
  ],
  [
    'supabase/tests/medir-importacion.sql',
    'Importación de leads, 500 filas en lotes de 50 sobre 22.000 filas de actividad',
    UNA,
  ],
  [
    'supabase/tests/medir-volumen.sql',
    'Listas de un lead, 20.000 seguimientos y 5.000 recordatorios (con la forma del plan asertada)',
    MEDIANA,
  ],
  [
    'supabase/tests/medir-validar-formula.sql',
    'validar_formula() con una fórmula sintética de 200 y de 2.000 nodos, como authenticated (ms y buffers del EXPLAIN)',
    'mediana de 5 de 7 corridas',
  ],
]
// Las que necesitan el volumen de `pnpm db:sembrar-volumen` (50.000 leads…): aparte, porque la base de
// la semilla no lo tiene. `pnpm db:medir:volumen`; después, `pnpm db:reset`.
const MEDICIONES_CON_VOLUMEN = [
  [
    'supabase/tests/medir-escala.sql',
    'Escala de toda la app, 50.000 leads (dueña «todos» y Ana «propios»)',
    MEDIANA,
  ],
  [
    'supabase/tests/busqueda-volumen.sql',
    'La búsqueda por candidatos contra la consulta de siempre: la huella md5 de las filas enteras, en la base real con volumen (ñ, tildes y comodines)',
    UNA,
  ],
  [
    'supabase/tests/medir-importacion-volumen.sql',
    'Importar 500 filas en lotes de 50, con 23.000 y con 124.000 filas de actividad (con transacciones de verdad: confirma y borra lo que crea)',
    UNA,
  ],
  [
    'supabase/tests/medir-equipo.sql',
    'La lista del equipo con 100.000 personas: buffers leídos por cada etapa de `equipo_lista` (no ms: el plan y las filas que lee, con 10.000 y con 100.000)',
    UNA,
  ],
  [
    'supabase/tests/medir-rueda.sql',
    'La rueda de turnos por rol: 500 personas, 60 roles y 50.000 y 200.000 solicitudes (el costo de preguntar al repartir no crece con las solicitudes)',
    MEDIANA,
  ],
  ['supabase/tests/medir-jobs.sql', 'Los jobs con 100.000 filas por purgar (ms por corrida)', UNA],
  [
    'supabase/tests/medir-bajas.sql',
    'La baja de una persona con 200.000 leads (con transacciones de verdad: confirma y borra lo que crea)',
    UNA,
  ],
]
const MEDICIONES = CON_VOLUMEN ? MEDICIONES_CON_VOLUMEN : MEDICIONES_BASE

// Lo que una medición lee del repo: la base no lee archivos, así que se le antepone a la entrada de psql una tabla temporal
// `<nombre> (doc jsonb)` con una clave de un JSON. Las comillas dólar pasan el texto sin procesar escapes.
const DATOS_DE_MEDICION = {
  'supabase/tests/medir-validar-formula.sql': {
    _formulas_sinteticas: ['supabase/tests/corpus-de-formula.json', 'sinteticas'],
  },
}
function datosDe(archivo) {
  return Object.entries(DATOS_DE_MEDICION[archivo] ?? {})
    .map(([tabla, [ruta, clave]]) => {
      const texto = JSON.stringify(JSON.parse(readFileSync(ruta, 'utf8'))[clave])
      if (texto === undefined || texto.includes('$datos$')) {
        console.error(`No pude pasar ${ruta} › ${clave} a ${archivo}.`)
        process.exit(1)
      }
      return `create temp table ${tabla} as select $datos$${texto}$datos$::jsonb as doc;\ngrant select on ${tabla} to authenticated;\n`
    })
    .join('')
}

// Lo que pasaba en la máquina y en la base mientras corría una medición (cierre 4): un tiempo fuera de lo normal se explica con estos
// números o no se explica (un job tardó 6,4 s una vez y 0,2 s la siguiente; «la máquina estaba ocupada» no es una causa). La carga y
// la presión de disco y de CPU (`/proc/pressure`) son de quien corre esto; los contadores de WAL, de checkpoints y los autovacuums
// activos, de la base. Nueve corridas de los jobs (db:reset, CHECKPOINT antes, 33 checkpoints encima, un autovacuum activo) no
// reprodujeron el 6,4 s: el único caso lento tuvo +13 s de `sync` del checkpointer, un fsync lento del disco.
const lecturaDePresion = (recurso) => {
  const ruta = `/proc/pressure/${recurso}`
  if (!existsSync(ruta)) {
    return null
  }
  const algo = /^some avg10=([\d.]+) avg60=([\d.]+)/m.exec(readFileSync(ruta, 'utf8'))
  return algo ? { avg10: Number(algo[1]), avg60: Number(algo[2]) } : null
}

function fotoDeLaMaquina() {
  const consulta =
    'select wal_records, wal_fpi, wal_bytes from pg_stat_wal; ' +
    'select num_timed + num_requested, write_time, sync_time from pg_stat_checkpointer; ' +
    "select count(*) from pg_stat_activity where backend_type = 'autovacuum worker'"
  const lectura = spawnSync(
    'docker',
    ['exec', contenedor, 'psql', '-U', 'postgres', '-At', '-F', '|', '-c', consulta],
    { encoding: 'utf8' },
  )
  const [wal, checkpoints, autovacuum] = lectura.stdout.trim().split('\n')
  const [registros, fpi, bytes] = (wal ?? '').split('|').map(Number)
  const [cuantos, escritura, sincronizacion] = (checkpoints ?? '').split('|').map(Number)
  return {
    carga: loadavg(),
    io: lecturaDePresion('io'),
    cpu: lecturaDePresion('cpu'),
    registros,
    fpi,
    bytes,
    checkpoints: cuantos,
    escritura,
    sincronizacion,
    autovacuum: Number(autovacuum),
  }
}

const numero = (valor, decimales = 0) =>
  Number.isFinite(valor)
    ? valor.toLocaleString('es-BO', {
        maximumFractionDigits: decimales,
        minimumFractionDigits: decimales,
      })
    : '?'

const cargaEscrita = (foto) => foto.carga.map((c) => numero(c, 2)).join(' / ')
const presionEscrita = (recurso) =>
  recurso ? `${numero(recurso.avg10, 1)} % (60 s: ${numero(recurso.avg60, 1)} %)` : '?'

// Cómo estaba la máquina antes de medir nada (5a-fix-1b): una guarda que falla con la máquina ya cargada deja la evidencia en la
// salida, y no se «arregla» corriéndola otra vez.
function lineaAlEmpezar(foto) {
  return (
    `Máquina al empezar: carga ${cargaEscrita(foto)} (1 / 5 / 15 min)` +
    (foto.io ? ` · disco ${presionEscrita(foto.io)}` : '') +
    (foto.cpu ? ` · CPU ${presionEscrita(foto.cpu)}` : '') +
    ` · autovacuum activos: ${numero(foto.autovacuum)}`
  )
}

// Una línea con lo que cambió entre antes y después, y con qué carga: la de al empezar y la de al terminar.
function lineaDeLaMaquina(antes, despues) {
  const presion = (nombre, recurso) =>
    despues[recurso]
      ? ` · ${nombre} ${presionEscrita(antes[recurso])} → ${presionEscrita(despues[recurso])}`
      : ''
  return (
    `  máquina: carga al empezar ${cargaEscrita(antes)} → al terminar ${cargaEscrita(despues)}` +
    presion('disco', 'io') +
    presion('CPU', 'cpu') +
    ` · WAL +${numero((despues.bytes - antes.bytes) / 1048576)} MB (imágenes completas +${numero(despues.fpi - antes.fpi)})` +
    ` · checkpoints +${numero(despues.checkpoints - antes.checkpoints)} (escribir +${numero(despues.escritura - antes.escritura)} ms, sync +${numero(despues.sincronizacion - antes.sincronizacion)} ms)` +
    ` · autovacuum activos: ${numero(antes.autovacuum)} → ${numero(despues.autovacuum)}`
  )
}

console.log(`Tamaños de página (del código): ${JSON.stringify(VARIABLES_DE_PAGINA)}`)
console.log(lineaAlEmpezar(fotoDeLaMaquina()))
for (const [archivo, titulo, corridas] of MEDICIONES) {
  const sql = datosDe(archivo) + readFileSync(archivo, 'utf8')
  const antes = fotoDeLaMaquina()
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
  const despues = fotoDeLaMaquina()
  if (corrida.error || corrida.status !== 0) {
    console.error(corrida.error?.message ?? corrida.stderr)
    console.error(`Lo que pasaba durante ${archivo}:\n${lineaDeLaMaquina(antes, despues)}`)
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
  console.log(`${titulo} (${corridas}, ms):`)
  for (const { consulta, ms } of medidas) {
    console.log(`  ${consulta.padEnd(ancho)}  ${ms.toFixed(1).padStart(7)}`)
  }
  console.log(lineaDeLaMaquina(antes, despues))
}
