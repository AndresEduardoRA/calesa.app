// El stack local de Supabase de ESTE worktree: su project_id (los contenedores se llaman `supabase_<servicio>_<project_id>`) y sus
// puertos. Manda, en este orden: la variable `SUPABASE_*` del entorno, `.env.carril` (lo escribe scripts/worktree/preparar.sh en un
// carril de Orca) y `supabase/config.toml` (la principal). La CLI de Supabase lee las mismas variables, así que un carril tiene su
// stack sin tocar config.toml (docs/ORCA.md).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

// Cada carril corre su stack y su app con un desfase sobre los de la principal (la principal es el 0).
export const DESFASES = { a: 100, b: 200 }

const BASE = {
  SUPABASE_API_PORT: 54621,
  SUPABASE_DB_PORT: 54622,
  SUPABASE_DB_SHADOW_PORT: 54620,
  SUPABASE_STUDIO_PORT: 54623,
  SUPABASE_LOCAL_SMTP_PORT: 54624,
  SUPABASE_ANALYTICS_PORT: 54627,
  SUPABASE_EDGE_RUNTIME_INSPECTOR_PORT: 8083,
  PUERTO_APP: 3000,
  E2E_PORT: 3210,
}

/**
 * El `.env.carril` de un carril: el project_id, los puertos y lo que leen los e2e y el piloto. Puro: sin I/O.
 * @param {string} carril
 * @returns {Record<string, string | number>}
 */
export function variablesDelCarril(carril) {
  const desfase = DESFASES[/** @type {keyof typeof DESFASES} */ (carril)]
  if (desfase === undefined)
    throw new Error(`carril desconocido: «${carril}» (son: ${Object.keys(DESFASES).join(', ')})`)
  const puertos = Object.fromEntries(
    Object.entries(BASE).map(([clave, puerto]) => [clave, puerto + desfase]),
  )
  return {
    SUPABASE_PROJECT_ID: `importadora-${carril}`,
    ...puertos,
    // Los enlaces de los correos de Auth llevan a la app de este carril (config.toml › additional_redirect_urls los admite).
    SUPABASE_AUTH_SITE_URL: `http://localhost:${String(puertos.PUERTO_APP)}`,
    E2E_MAILPIT_URL: `http://127.0.0.1:${String(puertos.SUPABASE_LOCAL_SMTP_PORT)}`,
    PILOTO_SUPABASE_URL: `http://127.0.0.1:${String(puertos.SUPABASE_API_PORT)}`,
  }
}

export function leerEnvCarril(raiz = process.cwd()) {
  const archivo = join(raiz, '.env.carril')
  return existsSync(archivo) ? parseEnv(readFileSync(archivo, 'utf8')) : {}
}

function deConfig(raiz) {
  const toml = readFileSync(join(raiz, 'supabase/config.toml'), 'utf8')
  const seccion = (nombre) =>
    new RegExp(`^\\[${nombre}\\]\\s*$([\\s\\S]*?)(?=^\\[|(?![\\s\\S]))`, 'm').exec(toml)?.[1] ?? ''
  const puerto = (nombre, clave = 'port') =>
    Number(new RegExp(`^${clave}\\s*=\\s*(\\d+)`, 'm').exec(seccion(nombre))?.[1])
  return {
    SUPABASE_PROJECT_ID: /^project_id\s*=\s*"([^"]+)"/m.exec(toml)?.[1],
    SUPABASE_API_PORT: puerto('api'),
    SUPABASE_DB_PORT: puerto('db'),
    SUPABASE_LOCAL_SMTP_PORT: puerto('local_smtp'),
  }
}

/**
 * El stack de este worktree. `entorno` y `raiz` se inyectan en las pruebas.
 * @param {string} [raiz]
 * @param {Record<string, string | undefined>} [entorno]
 */
export function stackLocal(raiz = process.cwd(), entorno = process.env) {
  const carril = leerEnvCarril(raiz)
  const config = deConfig(raiz)
  const valor = (clave) => entorno[clave] || carril[clave] || config[clave]
  const proyecto = valor('SUPABASE_PROJECT_ID')
  if (!proyecto)
    throw new Error(
      'No sé el project_id del stack local (ni SUPABASE_PROJECT_ID, ni .env.carril, ni config.toml).',
    )
  const puertoApi = Number(valor('SUPABASE_API_PORT'))
  const puertoDb = Number(valor('SUPABASE_DB_PORT'))
  const puertoMailpit = Number(valor('SUPABASE_LOCAL_SMTP_PORT'))
  return {
    proyecto,
    contenedorDb: `supabase_db_${proyecto}`,
    puertoApi,
    puertoDb,
    urlApi: `http://127.0.0.1:${String(puertoApi)}`,
    urlDb: `postgresql://postgres:postgres@127.0.0.1:${String(puertoDb)}/postgres`,
    urlMailpit: `http://127.0.0.1:${String(puertoMailpit)}`,
  }
}
