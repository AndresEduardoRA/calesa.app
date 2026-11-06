// Los dominios de migración de cada carril (`migraciones` en docs/plan.yaml): lo que lee la guarda de carriles
// (`scripts/guardas/carriles.mjs`) para saber qué migraciones puede crear un carril que no es base. Puro. Se prueba en `plan.test.mjs`.
const DOMINIO = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/
// Dos dominios se pisan si son iguales o uno es `<otro>_…`: el nombre de una migración empieza por un dominio.
const sePisan = (a, b) => a === b || a.startsWith(`${b}_`) || b.startsWith(`${a}_`)

/** @returns {string[]} los problemas de `migraciones` de todos los carriles del plan. */
export function problemasDeMigraciones(plan) {
  const p = []
  const de = []
  for (const c of plan.carriles) {
    if (c.migraciones === undefined) continue
    if (c.base === true) {
      p.push(
        `carril ${c.id}: MIGRACIONES: el carril base crea migraciones de cualquier dominio; no lleva migraciones`,
      )
      continue
    }
    if (!Array.isArray(c.migraciones)) {
      p.push(`carril ${c.id}: MIGRACIONES: debe ser una lista de dominios`)
      continue
    }
    const vistos = new Set()
    for (const d of c.migraciones) {
      if (typeof d !== 'string' || !DOMINIO.test(d))
        p.push(`carril ${c.id}: MIGRACIONES: «${String(d)}» no es un dominio (minúsculas y _)`)
      else if (vistos.has(d)) p.push(`carril ${c.id}: MIGRACIONES: ${d} repetido`)
      else {
        vistos.add(d)
        de.push([c.id, d])
      }
    }
  }
  for (let i = 0; i < de.length; i++)
    for (let j = i + 1; j < de.length; j++) {
      const [ca, da] = de[i] ?? []
      const [cb, db] = de[j] ?? []
      if (ca !== cb && sePisan(da, db)) p.push(`MIGRACIONES: ${ca} y ${cb} comparten ${da} / ${db}`)
    }
  return p
}
