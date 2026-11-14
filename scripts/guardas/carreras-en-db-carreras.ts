import { posix } from 'node:path'

// Toda carrera escrita corre en `pnpm db:carreras`: los módulos de carreras (`scripts/carreras/*.mjs` y los
// `supabase/tests/areas/**/carreras*.mjs`) tienen que alcanzarse, por imports relativos, desde `scripts/carreras.mjs`.
export const ENTRADA = 'scripts/carreras.mjs'

export const esModuloDeCarreras = (ruta: string) =>
  /^scripts\/carreras\/[^/]+\.mjs$/.test(ruta) ||
  /^supabase\/tests\/areas\/.+\/carreras[^/]*\.mjs$/.test(ruta)

// Los imports relativos de un módulo, resueltos desde la raíz del repo.
export function importsDe(ruta: string, texto: string): string[] {
  const dir = posix.dirname(ruta)
  return [...texto.matchAll(/\bfrom\s+'(\.{1,2}\/[^']+)'/g)].map((m) => posix.join(dir, m[1] ?? ''))
}

// Los módulos de carreras que `db:carreras` no corre. `archivos`: ruta (desde la raíz) → texto.
export function carrerasSinCorrer(archivos: ReadonlyMap<string, string>): string[] {
  const vistos = new Set<string>()
  const pendientes = [ENTRADA]
  while (pendientes.length > 0) {
    const ruta = pendientes.pop() as string
    if (vistos.has(ruta)) continue
    vistos.add(ruta)
    const texto = archivos.get(ruta)
    if (texto !== undefined) pendientes.push(...importsDe(ruta, texto))
  }
  return [...archivos.keys()].filter((r) => esModuloDeCarreras(r) && !vistos.has(r)).sort()
}
