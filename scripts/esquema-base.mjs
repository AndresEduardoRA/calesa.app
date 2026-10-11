// Genera la migración base a partir de supabase/schemas, en el orden de `schema_paths` de config.toml.
//
//   node scripts/esquema-base.mjs           escribe supabase/migrations/<NOMBRE_BASE>
//   node scripts/esquema-base.mjs --check   falla (exit 1) si la migración base está desactualizada
//
// Por qué existe: `supabase start` y `supabase db reset` sólo aplican migrations/, no schemas/.
// Sin esta migración, 000100_rbac.sql corre contra una base sin tablas. Mientras no haya base en
// producción se regenera en cada cambio de schema; después del primer `db push` se congela y los
// cambios van como migraciones incrementales (docs/DECISIONES.md).
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const NOMBRE_BASE = '20261011000000_esquema_base.sql'

const CABECERA = `-- GENERADO por scripts/esquema-base.mjs a partir de supabase/schemas. No editar a mano:
-- se edita el archivo de schemas/ y se corre \`pnpm db:base\`.
`

function rutasDeclaradas(base) {
  const toml = fs.readFileSync(path.join(base, 'config.toml'), 'utf8')
  const bloque = /^schema_paths\s*=\s*\[([^\]]*)\]/m.exec(toml)
  if (!bloque) {
    throw new Error('config.toml no declara schema_paths en [db.migrations]')
  }
  return [...bloque[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

// config.toml sólo usa el patrón `<carpeta>/*.sql`; cualquier otra cosa se toma como ruta literal.
function expandir(base, patron) {
  if (path.basename(patron) !== '*.sql') {
    return [path.join(base, patron)]
  }
  const carpeta = path.join(base, path.dirname(patron))
  return fs
    .readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith('.sql'))
    .sort()
    .map((nombre) => path.join(carpeta, nombre))
}

export function generarEsquemaBase(base = 'supabase') {
  const partes = rutasDeclaradas(base)
    .flatMap((patron) => expandir(base, patron))
    .map((archivo) => {
      const relativa = path.relative(base, archivo).split(path.sep).join('/')
      return `\n-- >>> ${relativa}\n${fs.readFileSync(archivo, 'utf8').trimEnd()}\n`
    })
  return CABECERA + partes.join('')
}

export function rutaEsquemaBase(base = 'supabase') {
  return path.join(base, 'migrations', NOMBRE_BASE)
}

export function esquemaBaseAlDia(base = 'supabase') {
  const ruta = rutaEsquemaBase(base)
  return fs.existsSync(ruta) && fs.readFileSync(ruta, 'utf8') === generarEsquemaBase(base)
}

function principal() {
  const args = process.argv.slice(2)
  const verificar = args.includes('--check')
  const base = args.find((a) => !a.startsWith('--')) ?? 'supabase'
  const ruta = rutaEsquemaBase(base)

  if (verificar) {
    if (!esquemaBaseAlDia(base)) {
      console.error(`✗ ${ruta} está desactualizada. Corre: pnpm db:base`)
      process.exit(1)
    }
    return
  }
  fs.writeFileSync(ruta, generarEsquemaBase(base))
  console.warn(`✓ ${ruta}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal()
}
