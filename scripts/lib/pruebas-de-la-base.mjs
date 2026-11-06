// El orden en que `db:probar` corre las pruebas SQL (4.15-7): su lista fija (`scripts/probar-schema.mjs`) y, después, todo `.sql` bajo
// `supabase/tests/areas/` (recursivo, en orden alfabético de la ruta relativa a `supabase/tests/`). Así un carril que no es base suma las pruebas
// de su área (`areas/<área>/x.sql`) sin editar la lista, que es del A. `solo` (lo de `SOLO=`) filtra por nombre de la lista o por esa ruta relativa.
import fs from 'node:fs'
import path from 'node:path'

function* sqlDe(dir, relativa) {
  for (const e of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const rel = `${relativa}/${e.name}`
    if (e.isDirectory()) yield* sqlDe(path.join(dir, e.name), rel)
    else if (e.name.endsWith('.sql')) yield rel
  }
}

/**
 * @param {readonly string[]} listaFija
 * @param {string} dirDeTests
 * @param {readonly string[]} [solo]
 * @returns {string[]}
 */
export function pruebasEnOrden(listaFija, dirDeTests, solo) {
  const areas = path.join(dirDeTests, 'areas')
  const deLasAreas = fs.existsSync(areas) ? [...sqlDe(areas, 'areas')] : []
  const todas = [...listaFija, ...deLasAreas]
  return solo ? todas.filter((a) => solo.includes(a)) : todas
}
