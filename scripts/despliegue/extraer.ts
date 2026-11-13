// Lo que el repo declara para un despliegue, leído del texto de sus archivos (puro: la lectura de disco la hace `revisar-base.mjs`). Cada
// extractor cuenta lo que no entiende (un `cron.schedule(` sin nombre literal, un `Deno.env.get(` sin nombre): eso es una falta, para que una
// declaración con otra forma no desaparezca del inventario sin aviso (9.13-2, D23).

export type Archivo = { ruta: string; texto: string }
export type Declarado = { nombre: string; archivo: string }

export type Esperado = {
  jobs: Declarado[]
  buckets: { id: string; publico: boolean; archivo: string }[]
  vault: {
    leidos: Declarado[]
    prefijos: Declarado[]
    creadosEnMigraciones: string[]
    creadosEnSemilla: string[]
  }
  funciones: { nombre: string; secretos: string[] }[]
  configFunciones: string[]
  llamadas: Declarado[]
  secretosDeProduccion: string[]
  noEntendidos: string[]
}

const MIGRACION = /^supabase\/migrations\/[^/]+\.sql$/
const SEMILLA = 'supabase/seed.sql'
const CONFIG = 'supabase/config.toml'
const FUNCION = /^supabase\/functions\/([^/]+)\/(.+\.ts)$/

const linea = (texto: string, indice: number) => texto.slice(0, indice).split('\n').length

function todos(re: RegExp, texto: string): RegExpExecArray[] {
  return [
    ...texto.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')),
  ]
}

// Las posiciones de `ocurrencia` que ninguna coincidencia de `entendido` cubre, como «<archivo>:<línea>».
function sinEntender(a: Archivo, ocurrencia: RegExp, entendido: RegExp): string[] {
  const cubiertas = new Set(todos(entendido, a.texto).map((m) => m.index))
  return todos(ocurrencia, a.texto)
    .filter((m) => !cubiertas.has(m.index))
    .map((m) => `${a.ruta}:${String(linea(a.texto, m.index))}`)
}

function jobs(migraciones: Archivo[], noEntendidos: string[]): Declarado[] {
  const vigentes = new Map<string, string>()
  for (const a of migraciones) {
    for (const m of todos(/cron\.schedule\(\s*'([^']+)'/, a.texto)) vigentes.set(m[1] ?? '', a.ruta)
    for (const m of todos(/cron\.unschedule\(\s*'([^']+)'/, a.texto)) vigentes.delete(m[1] ?? '')
    for (const donde of sinEntender(a, /cron\.schedule\(/, /cron\.schedule\(\s*'/))
      noEntendidos.push(`job sin nombre fijo en ${donde}`)
  }
  return [...vigentes].map(([nombre, archivo]) => ({ nombre, archivo }))
}

function buckets(migraciones: Archivo[], noEntendidos: string[]): Esperado['buckets'] {
  const porId = new Map<string, Esperado['buckets'][number]>()
  for (const a of migraciones) {
    const bloques = todos(
      /insert\s+into\s+storage\.buckets\s*\([^)]*\)\s*values([\s\S]*?)(?:on\s+conflict|;)/i,
      a.texto,
    )
    for (const b of bloques) {
      const filas = todos(/\(\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*(true|false)/, b[1] ?? '')
      if (filas.length === 0)
        noEntendidos.push(
          `un insert en storage.buckets sin filas legibles en ${a.ruta}:${String(linea(a.texto, b.index))}`,
        )
      for (const f of filas)
        porId.set(f[1] ?? '', { id: f[1] ?? '', publico: f[2] === 'true', archivo: a.ruta })
    }
    for (const donde of sinEntender(
      a,
      /insert\s+into\s+storage\.buckets/i,
      /insert\s+into\s+storage\.buckets\s*\([^)]*\)\s*values/i,
    ))
      noEntendidos.push(`un insert en storage.buckets sin filas legibles en ${donde}`)
  }
  return [...porId.values()]
}

const LECTURA_DE_VAULT =
  /decrypted_secrets(?:\s+(?:as\s+)?\w+)?\s+where\s+(?:\w+\.)?name\s*=\s*'([^']+)'(\s*\|\|)?/i
const CREADO_POR_NOMBRE = /new_name\s*=>\s*'([^']+)'/
const CREADO_POR_POSICION = /vault\.create_secret\(\s*'[^']*'\s*,\s*'([^']+)'/

function vault(
  migraciones: Archivo[],
  semilla: Archivo | undefined,
  noEntendidos: string[],
): Esperado['vault'] {
  const leidos: Declarado[] = []
  const prefijos: Declarado[] = []
  const creados = (as: Archivo[]) =>
    as.flatMap((a) =>
      [...todos(CREADO_POR_NOMBRE, a.texto), ...todos(CREADO_POR_POSICION, a.texto)].map(
        (m) => m[1] ?? '',
      ),
    )
  for (const a of [...migraciones, ...(semilla ? [semilla] : [])]) {
    for (const m of todos(LECTURA_DE_VAULT, a.texto))
      (m[2] ? prefijos : leidos).push({ nombre: m[1] ?? '', archivo: a.ruta })
    for (const donde of sinEntender(
      a,
      /decrypted_secrets/,
      /decrypted_secrets(?:\s+(?:as\s+)?\w+)?\s+where\s+(?:\w+\.)?name\s*=\s*'/i,
    ))
      noEntendidos.push(`una lectura de Vault sin nombre fijo en ${donde}`)
  }
  const unicos = (ds: Declarado[]) => [...new Map(ds.map((d) => [d.nombre, d])).values()]
  return {
    leidos: unicos(leidos),
    prefijos: unicos(prefijos),
    creadosEnMigraciones: [...new Set(creados(migraciones))],
    creadosEnSemilla: [...new Set(creados(semilla ? [semilla] : []))],
  }
}

function funciones(archivos: Archivo[], noEntendidos: string[]): Esperado['funciones'] {
  const porCarpeta = new Map<string, Archivo[]>()
  for (const a of archivos) {
    const m = FUNCION.exec(a.ruta)
    if (!m || (m[2] ?? '').endsWith('.test.ts')) continue
    porCarpeta.set(m[1] ?? '', [...(porCarpeta.get(m[1] ?? '') ?? []), a])
  }
  return [...porCarpeta]
    .filter(([carpeta, as]) => as.some((a) => a.ruta === `supabase/functions/${carpeta}/index.ts`))
    .map(([nombre, as]) => {
      const secretos = new Set<string>()
      for (const a of as) {
        for (const m of todos(/Deno\.env\.get\(\s*['"]([A-Z0-9_]+)['"]\s*\)/, a.texto))
          secretos.add(m[1] ?? '')
        for (const donde of sinEntender(
          a,
          /Deno\.env\.get\(/,
          /Deno\.env\.get\(\s*['"][A-Z0-9_]+['"]\s*\)/,
        ))
          noEntendidos.push(`un secreto sin nombre fijo en ${donde}`)
      }
      return { nombre, secretos: [...secretos].sort() }
    })
    .sort((x, y) => x.nombre.localeCompare(y.nombre))
}

/** @param secretosDeProduccion las claves de `esquemaDeLasFunciones` (`src/shared/config/esquemas.ts`), lo que `env:check produccion` pide. */
export function esperadoDelRepo(archivos: Archivo[], secretosDeProduccion: string[]): Esperado {
  const noEntendidos: string[] = []
  const migraciones = archivos
    .filter((a) => MIGRACION.test(a.ruta))
    .sort((x, y) => x.ruta.localeCompare(y.ruta))
  const config = archivos.find((a) => a.ruta === CONFIG)?.texto ?? ''
  const llamadas = new Map<string, string>()
  for (const a of migraciones)
    for (const m of todos(/\/functions\/v1\/([a-z0-9-]+)/, a.texto))
      llamadas.set(m[1] ?? '', a.ruta)
  return {
    jobs: jobs(migraciones, noEntendidos),
    buckets: buckets(migraciones, noEntendidos),
    vault: vault(
      migraciones,
      archivos.find((a) => a.ruta === SEMILLA),
      noEntendidos,
    ),
    funciones: funciones(archivos, noEntendidos),
    configFunciones: todos(/^\[functions\.([a-z0-9-]+)\]/m, config).map((m) => m[1] ?? ''),
    llamadas: [...llamadas].map(([nombre, archivo]) => ({ nombre, archivo })),
    secretosDeProduccion,
    noEntendidos,
  }
}
