// Los docs sin conflictos entre carriles. En un carril con coordinador (`PILOTO_CARRIL`), un paso NO edita `docs/BITACORA.md` ni
// `docs/DECISIONES.md` (los editarían todos a la vez): escribe lo suyo en `docs/pasos/<paso>/bitacora.md` y `decisiones.md`. El carril
// base (`a`) los pasa a los docs compartidos con este script, en el orden de `docs/plan.yaml`, una sola vez por paso (lo marca con
// `<!-- paso:<id> -->`). `e2e completo: sí|no (…)` cuenta también lo que aún no se pasó (`textoParaLaCuenta`).
//
//   node scripts/coordinador/consolidar-docs.mjs [--en-seco]     pasa lo pendiente; imprime qué pasos pasó
//
// Se prueba en `consolidar-docs.test.ts`.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { leerPlan } from './plan.mjs'

const marca = (id) => `<!-- paso:${id} -->`

/** Los pasos de docs/pasos/ en el orden del plan (los que el plan no conoce, al final, por nombre). */
export function pasosEnOrden(raiz, plan) {
  const dir = join(raiz, 'docs/pasos')
  if (!existsSync(dir)) return []
  const hay = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  const orden = plan.pasos.map((p) => p.id)
  return [
    ...orden.filter((id) => hay.includes(id)),
    ...hay.filter((id) => !orden.includes(id)).sort(),
  ]
}

function pendientes(raiz, plan, archivo, destino) {
  const actual = existsSync(join(raiz, destino)) ? readFileSync(join(raiz, destino), 'utf8') : ''
  return pasosEnOrden(raiz, plan)
    .filter(
      (id) => !actual.includes(marca(id)) && existsSync(join(raiz, 'docs/pasos', id, archivo)),
    )
    .map((id) => ({
      id,
      texto: readFileSync(join(raiz, 'docs/pasos', id, archivo), 'utf8').trim(),
    }))
    .filter((p) => p.texto)
}

/** Pasa lo pendiente a BITACORA y DECISIONES. Devuelve los ids pasados a cada una. Con `enSeco`, no escribe. */
export function consolidar(raiz, plan, { enSeco = false } = {}) {
  const hecho = /** @type {Record<string, string[]>} */ ({})
  for (const [archivo, destino] of [
    ['bitacora.md', 'docs/BITACORA.md'],
    ['decisiones.md', 'docs/DECISIONES.md'],
  ]) {
    const lista = pendientes(raiz, plan, archivo, destino)
    hecho[destino] = lista.map((p) => p.id)
    if (lista.length === 0 || enSeco) continue
    const actual = readFileSync(join(raiz, destino), 'utf8').replace(/\n*$/, '\n')
    writeFileSync(
      join(raiz, destino),
      actual + lista.map((p) => `\n${marca(p.id)}\n${p.texto}\n`).join(''),
    )
  }
  return hecho
}

/** BITACORA más lo que los carriles dejaron en docs/pasos/ sin pasar todavía: lo que lee la cuenta de e2e completo. */
export function textoParaLaCuenta(raiz, plan) {
  const bitacora = readFileSync(join(raiz, 'docs/BITACORA.md'), 'utf8')
  return (
    bitacora +
    '\n' +
    pendientes(raiz, plan, 'bitacora.md', 'docs/BITACORA.md')
      .map((p) => p.texto)
      .join('\n')
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raiz = process.cwd()
  const plan = leerPlan(
    readFileSync(process.env.COORD_PLAN || join(raiz, 'docs/plan.yaml'), 'utf8'),
  )
  const r = consolidar(raiz, plan, { enSeco: process.argv.includes('--en-seco') })
  for (const [destino, ids] of Object.entries(r))
    console.log(`${destino}: ${ids.length ? ids.join(', ') : 'nada pendiente'}`)
}
