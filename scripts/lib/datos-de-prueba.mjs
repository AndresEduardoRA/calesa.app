// Los datos que una prueba de `db:probar` lee del repo (`scripts/probar-schema.mjs`): la base no lee archivos, así que se los pasa el
// cliente en una tabla temporal `<nombre> (doc jsonb)`, creada antes de correr su archivo. La ruta es relativa a la raíz del repo.
// - `'<ruta>'`: el archivo como JSON.
// - `{ ruta, texto: true }`: el archivo como texto (`to_jsonb(texto)`), p. ej. una migración que la prueba vuelve a ejecutar.
// - `{ consulta, schemasDe }`: corre el SQL de `consulta` sobre la base de la prueba entre `begin` y `rollback` (su `set local` no sale) y
//   guarda una fila por cada fila del último resultado que trae `cache_key` (`scripts/splinter.sql`: `{ name, level, cache_key, detail,
//   schema }`). Con `schemasDe` (un `config.toml`), antes fija `pgrst.db_schemas` con los esquemas de su `[api]`: lo que la API expone de
//   verdad, no el `public` que splinter supone sin la variable (9.13-1).
import fs from 'node:fs'

/** Los esquemas de `[api] schemas = [...]` de un `config.toml` de Supabase, separados por coma. */
export function schemasDeLaApi(textoDelToml) {
  const sinComentarios = textoDelToml.replace(/#.*$/gm, '')
  const api = /^\[api\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(sinComentarios)?.[1] ?? ''
  const lista = /^\s*schemas\s*=\s*\[([^\]]*)\]/m.exec(api)?.[1]
  if (lista === undefined) throw new Error('config.toml sin [api] schemas')
  return [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join(',')
}

async function cargarConsulta(db, tabla, { consulta, schemasDe }) {
  let filas = []
  await db.exec('begin')
  try {
    if (schemasDe)
      await db.query(`select set_config('pgrst.db_schemas', $1, true)`, [
        schemasDeLaApi(fs.readFileSync(schemasDe, 'utf8')),
      ])
    const resultados = await db.exec(fs.readFileSync(consulta, 'utf8'))
    const ultimo = resultados.findLast((r) => r.fields.some((f) => f.name === 'cache_key'))
    if (!ultimo) throw new Error(`${consulta} no devolvió una columna cache_key`)
    filas = ultimo.rows.map((r) => ({
      name: r.name,
      level: r.level,
      cache_key: r.cache_key,
      detail: r.detail,
      schema: r.metadata?.schema ?? null,
    }))
  } finally {
    await db.exec('rollback')
  }
  await db.exec(`drop table if exists pg_temp.${tabla}; create temp table ${tabla} (doc jsonb)`)
  await db.query(`insert into ${tabla} (doc) select value from jsonb_array_elements($1::jsonb)`, [
    JSON.stringify(filas),
  ])
}

/**
 * @param {{ exec: (sql: string) => Promise<unknown>, query: (sql: string, params?: unknown[]) => Promise<unknown> }} db
 * @param {Record<string, string | { ruta: string, texto?: boolean } | { consulta: string, schemasDe?: string }>} datos las tablas de un archivo
 */
export async function cargarDatos(db, datos) {
  for (const [tabla, dato] of Object.entries(datos)) {
    if (typeof dato === 'object' && 'consulta' in dato) {
      await cargarConsulta(db, tabla, dato)
      continue
    }
    const { ruta, texto } = typeof dato === 'string' ? { ruta: dato, texto: false } : dato
    await db.exec(`drop table if exists pg_temp.${tabla}; create temp table ${tabla} (doc jsonb)`)
    await db.query(
      texto
        ? `insert into ${tabla} (doc) values (to_jsonb($1::text))`
        : `insert into ${tabla} (doc) values ($1::jsonb)`,
      [fs.readFileSync(ruta, 'utf8')],
    )
  }
}
