// La lista de avisos con motivo (`supabase/tests/advisors-con-motivo.json`) contra la base real, en lo que `advisors.sql` no puede mirar en
// PGlite: el sentido inverso (un motivo de un aviso que ya no existe) y los avisos de `pnpm db:lint` por función. Puro; lo usa
// `revisar-base.mjs` (9.13-2, C5, C6). Y la regla de qué base se puede tocar: sólo una local (C3).

export type Lista = {
  avisos: { lint: string; clave: string }[]
  comodines: { lint: string }[]
  fuera: { lint: string }[]
  db_lint: { patron: string; avisos: number }[]
}
export type Aviso = { name: string; cache_key: string }

/**
 * Una falta por cada entrada exacta cuyo aviso ya no da la base, y por cada comodín cuyo lint no da ninguno. Un comodín `pg_graphql_*` queda
 * exento sólo si la base no tiene `pg_graphql` (la local no lo trae; un proyecto de Supabase sí). Los `fuera` no se comparan.
 */
export function avisosSobrantes(lista: Lista, avisos: Aviso[], conGraphql: boolean): string[] {
  const claves = new Set(avisos.map((a) => `${a.name} ${a.cache_key}`))
  const lints = new Set(avisos.map((a) => a.name))
  return [
    ...lista.avisos
      .filter((e) => !claves.has(`${e.lint} ${e.clave}`))
      .map((e) => `motivo de un aviso que ya no existe: ${e.lint} · ${e.clave}`),
    ...lista.comodines
      .filter((c) => !lints.has(c.lint) && (conGraphql || !c.lint.startsWith('pg_graphql_')))
      .map((c) => `comodín de un lint que no da ningún aviso: ${c.lint}`),
  ]
}

export type ResultadoDeDbLint = { function: string; issues: unknown[] }

/**
 * Los resultados de `pnpm db:lint`, o `null` si la salida no los trae. La CLI elige el formato según quién la corre: con un agente
 * (`AI_AGENT`, `CLAUDECODE`) una línea `{"results":[…]}`; sin él (el CI), el arreglo con sangría, de la línea `[` a la línea `]`.
 */
export function leerDbLint(texto: string): ResultadoDeDbLint[] | null {
  const bloque = bloqueDeDbLint(texto.split('\n'))
  if (bloque === undefined) return null
  try {
    const leido = JSON.parse(bloque) as ResultadoDeDbLint[] | { results?: ResultadoDeDbLint[] }
    const resultados = Array.isArray(leido) ? leido : leido.results
    return Array.isArray(resultados) ? resultados : null
  } catch {
    return null
  }
}

function bloqueDeDbLint(lineas: string[]): string | undefined {
  const linea = lineas.find((l) => l.startsWith('{"results"'))
  if (linea !== undefined) return linea
  const desde = lineas.findIndex((l) => l.trimEnd() === '[' || l.trimEnd() === '[]')
  if (desde < 0) return undefined
  if (lineas[desde]?.trimEnd() === '[]') return '[]'
  const hasta = lineas.findIndex((l, i) => i > desde && l.trimEnd() === ']')
  return hasta < 0 ? undefined : lineas.slice(desde, hasta + 1).join('\n')
}

// `%` es el único comodín de un patrón (hoy ninguno lo usa: todos son el nombre exacto).
const coincide = (patron: string, funcion: string) =>
  patron.includes('%')
    ? new RegExp(
        `^${patron
          .split('%')
          .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*')}$`,
      ).test(funcion)
    : patron === funcion

export function compararDbLint(lista: Lista, resultados: ResultadoDeDbLint[] | null): string[] {
  if (resultados === null)
    return ['no se pudo leer la salida de db:lint (ni la línea {"results":…} ni el arreglo)']
  const conAvisos = resultados.filter((r) => r.issues.length > 0)
  const faltas: string[] = []
  for (const r of conAvisos) {
    const entradas = lista.db_lint.filter((d) => coincide(d.patron, r.function))
    if (entradas.length === 0)
      faltas.push(`db:lint sin motivo: ${r.function} (${String(r.issues.length)} avisos)`)
    else if (
      !entradas.some((d) => d.patron.includes('%')) &&
      entradas.every((d) => d.avisos !== r.issues.length)
    )
      faltas.push(
        `db:lint cambió: ${r.function} daba ${String(entradas[0]?.avisos)}, ahora ${String(r.issues.length)}: revisa el motivo`,
      )
  }
  for (const d of lista.db_lint)
    if (!conAvisos.some((r) => coincide(d.patron, r.function)))
      faltas.push(`motivo de db:lint de una función que ya no da avisos: ${d.patron}`)
  return faltas
}

export type DatosDeConexion = {
  host: string
  port: number
  user: string
  password: string
  database: string
}

const HOSTS_LOCALES = new Set(['127.0.0.1', 'localhost', '[::1]'])

/**
 * Los campos de conexión de una URL de Postgres, sólo si es local; si no, el motivo. Sin query string ni fragmento: en `pg`, `?host=` pisa
 * al host de la URL. La conexión se arma con estos campos, nunca con la URL entera.
 */
export function urlLocal(
  texto: string,
): { ok: true; datos: DatosDeConexion } | { ok: false; error: string } {
  let u: URL
  try {
    u = new URL(texto)
  } catch {
    return { ok: false, error: 'la URL de la base no se entiende' }
  }
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:')
    return { ok: false, error: 'la URL no es de Postgres' }
  if (u.search !== '' || u.hash !== '' || texto.includes('?') || texto.includes('#'))
    return { ok: false, error: 'la URL de la base no puede llevar parámetros' }
  if (!HOSTS_LOCALES.has(u.hostname))
    return { ok: false, error: `sólo una base local: ${u.hostname} no lo es` }
  return {
    ok: true,
    datos: {
      host: u.hostname === '[::1]' ? '::1' : u.hostname,
      port: Number(u.port || '5432'),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.slice(1)) || 'postgres',
    },
  }
}
