// La base local contra el repo, para el despliegue en seco y para el CI (9.13-2). Se corre con tsx porque importa la lógica pura en `.ts`:
//   pnpm exec tsx scripts/despliegue/revisar-base.mjs [advisors] [db-lint <salida de pnpm db:lint>] [inventario]
// - advisors: corre `supabase/tests/advisors.sql` (la misma regla que `db:probar`) contra esta base, con splinter y `pgrst.db_schemas` = los
//   `[api] schemas` de `supabase/config.toml`; y el sentido inverso: un motivo de un aviso que ya no existe (`avisos.ts`).
// - db-lint: los avisos de `pnpm db:lint` por función contra `db_lint` de la lista (`avisos.ts`).
// - inventario: jobs, buckets, nombres de Vault, funciones edge, llamadas y webhooks, del repo contra la base (`inventario.ts`).
// Sólo una base local: la del carril (`stackLocal()`) o, en el CI, `SUPABASE_DB_LOCAL`; se niega a conectarse a otra (sale con 64). De Vault
// lee sólo nombres, nunca un valor. Sale con 1 si hubo alguna falta.
import fs from 'node:fs'
import pg from 'pg'
import { esquemaDeLasFunciones } from '../../src/shared/config/esquemas.ts'
import { cargarDatos } from '../lib/datos-de-prueba.mjs'
import { stackLocal } from '../lib/stack-local.mjs'
import { avisosSobrantes, compararDbLint, leerDbLint, urlLocal } from './avisos.ts'
import { esperadoDelRepo } from './extraer.ts'
import { compararInventario } from './inventario.ts'
import { archivosDelRepo } from './repo.ts'

const LISTA = 'supabase/tests/advisors-con-motivo.json'
const PRUEBA = 'supabase/tests/advisors.sql'
// Los esquemas de la plataforma y de las extensiones: lo que la app no escribe.
const AJENOS = `n.nspname !~ '^pg_' and n.nspname not in ('information_schema', 'net', 'cron', 'vault', 'extensions', 'storage', 'auth',
  'graphql', 'graphql_public', 'realtime', '_realtime', 'supabase_functions', 'supabase_migrations', 'pgbouncer', 'pgsodium', '_analytics',
  '_supavisor')`

function pedido(argv) {
  const r = { advisors: false, dbLint: null, inventario: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === 'advisors') r.advisors = true
    else if (argv[i] === 'inventario') r.inventario = true
    else if (argv[i] === 'db-lint' && argv[i + 1]) r.dbLint = argv[++i]
    else throw new Error(`no entiendo «${argv[i]}»: advisors, db-lint <archivo>, inventario`)
  }
  if (!r.advisors && !r.inventario && r.dbLint === null)
    throw new Error('nada que revisar: advisors, db-lint <archivo>, inventario')
  return r
}

/** @param {pg.Client} cliente */
async function advisors(cliente, lista) {
  const db = {
    exec: async (sql) => {
      const r = await cliente.query(sql)
      return Array.isArray(r) ? r : [r]
    },
    query: (sql, params) => cliente.query(sql, params),
  }
  await cargarDatos(db, {
    _avisos: { consulta: 'scripts/splinter.sql', schemasDe: 'supabase/config.toml' },
    _avisos_con_motivo: LISTA,
  })
  const faltas = []
  // Cada bloque en su propia llamada: uno que cae no revierte a los demás (las funciones `pg_temp` del primero sí caen con él).
  for (const bloque of fs
    .readFileSync(PRUEBA, 'utf8')
    .split(/^-- @test\s+/m)
    .filter(Boolean)) {
    const [nombre = '', ...resto] = bloque.split('\n')
    try {
      await cliente.query(resto.join('\n'))
    } catch (e) {
      const sigue = faltas.length > 0 ? ' (puede ser consecuencia de la primera)' : ''
      faltas.push(
        `${nombre.trim()}${sigue}:\n      ${String(e.message).replaceAll('\n', '\n      ')}`,
      )
      await cliente.query('rollback').catch(() => undefined)
    }
  }
  const avisos = (await cliente.query('select doc from _avisos')).rows.map((r) => r.doc)
  const conGraphql = (
    await cliente.query(
      `select exists (select 1 from pg_extension where extname = 'pg_graphql') si`,
    )
  ).rows[0].si
  faltas.push(...avisosSobrantes(lista, avisos, conGraphql))
  return { faltas, conteo: `${String(avisos.length)} avisos de splinter` }
}

/** @param {pg.Client} cliente */
async function hallado(cliente) {
  const filas = async (sql) => (await cliente.query(sql)).rows
  return {
    jobs: (await filas('select jobname from cron.job')).map((r) => r.jobname),
    buckets: (await filas('select id, public from storage.buckets')).map((r) => ({
      id: r.id,
      publico: r.public,
    })),
    vault: (await filas('select name from vault.secrets where name is not null')).map(
      (r) => r.name,
    ),
    llamadas: await filas(`select p.oid::regprocedure::text desde, m[1] nombre
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
             regexp_matches(p.prosrc, '/functions/v1/([a-z0-9-]+)', 'g') m
       where ${AJENOS}`),
    posts: await filas(`select p.oid::regprocedure::text funcion,
             array(select distinct m[1] from regexp_matches(p.prosrc, '/functions/v1/([a-z0-9-]+)', 'g') m order by 1) destinos
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where ${AJENOS} and p.prosrc ~ 'net\\.http_post'`),
    triggers:
      await filas(`select t.tgname as trigger, t.tgrelid::regclass::text tabla, t.tgfoid::regprocedure::text funcion
        from pg_trigger t join pg_proc p on p.oid = t.tgfoid
       where not t.tgisinternal and p.prosrc ~ 'net\\.http_post'`),
  }
}

function imprimir(que, conteo, faltas) {
  console.log(faltas.length === 0 ? `✓ ${que} (${conteo})` : `✗ ${que} (${conteo})`)
  for (const f of faltas) console.log(`    - ${f}`)
}

const p = pedido(process.argv.slice(2))
const url =
  process.env.CI === 'true' && process.env.SUPABASE_DB_LOCAL
    ? process.env.SUPABASE_DB_LOCAL
    : stackLocal().urlDb
const local = urlLocal(url)
if (!local.ok) {
  console.error(`✗ ${local.error}`)
  process.exit(64)
}
const lista = JSON.parse(fs.readFileSync(LISTA, 'utf8'))
const paraLaPersona = []
let hayFaltas = false
const cliente = new pg.Client(local.datos)
await cliente.connect()
try {
  if (p.advisors) {
    const r = await advisors(cliente, lista)
    imprimir('advisors contra la base real, con los schemas de [api]', r.conteo, r.faltas)
    hayFaltas ||= r.faltas.length > 0
  }
  if (p.dbLint !== null) {
    const resultados = leerDbLint(fs.readFileSync(p.dbLint, 'utf8'))
    const faltas = compararDbLint(lista, resultados)
    imprimir(
      'db:lint contra su lista',
      `${String(resultados?.length ?? 0)} funciones con avisos`,
      faltas,
    )
    hayFaltas ||= faltas.length > 0
  }
  if (p.inventario) {
    const esperado = esperadoDelRepo(
      archivosDelRepo(process.cwd()),
      Object.keys(esquemaDeLasFunciones.shape),
    )
    const r = compararInventario(esperado, await hallado(cliente))
    imprimir('inventario del repo contra la base', r.resumen, r.faltas)
    paraLaPersona.push(...r.paraLaPersona)
    hayFaltas ||= r.faltas.length > 0
  }
} finally {
  await cliente.end()
}
for (const l of paraLaPersona) console.log(`Para la persona: ${l}`)
process.exit(hayFaltas ? 1 : 0)
