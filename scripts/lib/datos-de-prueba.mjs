// Los datos que una prueba de `db:probar` lee del repo (`scripts/probar-schema.mjs`): la base no lee archivos, así que se los pasa el
// cliente en una tabla temporal `<nombre> (doc jsonb)`, creada antes de correr su archivo. La ruta es relativa a la raíz del repo.
// - `'<ruta>'`: el archivo como JSON.
// - `{ ruta, texto: true }`: el archivo como texto (`to_jsonb(texto)`), p. ej. una migración que la prueba vuelve a ejecutar.
import fs from 'node:fs'

/**
 * @param {{ exec: (sql: string) => Promise<unknown>, query: (sql: string, params?: unknown[]) => Promise<unknown> }} db
 * @param {Record<string, string | { ruta: string, texto?: boolean }>} datos las tablas de un archivo de prueba
 */
export async function cargarDatos(db, datos) {
  for (const [tabla, dato] of Object.entries(datos)) {
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
