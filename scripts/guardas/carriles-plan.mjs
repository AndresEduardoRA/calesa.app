// Lo que un carril que no es base puede tocar fuera de lo que ya hace `carriles.mjs` (docs/ORCA.md, docs/plan.yaml de la base). Puro.
// - C5: en `docs/plan.yaml` sólo suma a su `dueno_de` archivos de las familias del compilador que el mismo PR crea; todo lo demás queda
//   como en la base (los `pasos`, y su `riesgo`, deciden si el coordinador integra solo).
// - C6: toca su `dueno_de` (más lo que C5 deja sumar) y `docs/`; en las carpetas `compartido` y en lo del carril base agrega y edita,
//   no borra (2026-11-08: lo que necesita del núcleo lo hace en su PR, sin esperar un pedido al A); lo de otro carril no base, nunca.
// Se prueba en `carriles.test.ts`.
import { isDeepStrictEqual } from 'node:util'

import { dentro } from '../coordinador/plan.mjs'
import { FAMILIAS_DEL_COMPILADOR, MODULO_DEL_COMPILADOR } from './familias-del-compilador.mjs'

const crea = (c) => c.estado[0] === 'A' || c.estado[0] === 'R' || c.estado[0] === 'C'
const borra = (c) => c.estado[0] === 'D' || c.estado[0] === 'R'
const esFamilia = (ruta) =>
  ruta.startsWith(MODULO_DEL_COMPILADOR) &&
  FAMILIAS_DEL_COMPILADOR.test(ruta.slice(MODULO_DEL_COMPILADOR.length))

/**
 * C5. `crudos`: docs/plan.yaml de la base y del PR, leídos enteros con `parse` (`pr` es `null` si no existe o no se pudo leer).
 * @returns {{ problemas: string[], sumadas: string[] }} `sumadas`: lo permitido que el carril sumó a su `dueno_de`.
 */
export function problemasDelPlanDelPr({ carril, cambios, crudos }) {
  const nombre = carril.id
  if (!cambios.some((c) => c.ruta === 'docs/plan.yaml' || c.antes === 'docs/plan.yaml'))
    return { problemas: [], sumadas: [] }
  const base = crudos.base
  const pr = crudos.pr
  const cb = base?.carriles?.find((c) => c.id === nombre)
  const cp = pr?.carriles?.find((c) => c.id === nombre)
  if (!base || !pr || !cb || !cp || !Array.isArray(cp.dueno_de)) {
    return {
      problemas: [
        `docs/plan.yaml: el carril ${nombre} no lo borra ni lo deja ilegible; lo cambia el carril a.`,
      ],
      sumadas: [],
    }
  }
  const creadas = new Set(cambios.filter(crea).map((c) => c.ruta))
  const antes = cb.dueno_de ?? []
  const extra = cp.dueno_de.slice(antes.length)
  const problemas = []
  const sumadas = []
  if (!isDeepStrictEqual(cp.dueno_de.slice(0, antes.length), antes))
    problemas.push(
      `docs/plan.yaml: el carril ${nombre} quita o reordena su dueno_de; sólo suma al final; lo demás lo cambia el carril a.`,
    )
  for (const ruta of extra) {
    if (creadas.has(ruta) && esFamilia(ruta)) sumadas.push(ruta)
    else
      problemas.push(
        `docs/plan.yaml: el carril ${nombre} suma ${String(ruta)} a su dueno_de; sólo puede sumar archivos de las familias del compilador que crea en este PR.`,
      )
  }
  const igual = {
    ...pr,
    carriles: pr.carriles.map((c) => (c === cp ? { ...c, dueno_de: antes } : c)),
  }
  if (!isDeepStrictEqual(igual, base)) {
    const claves = new Set([...Object.keys(base), ...Object.keys(pr)])
    const cambia = [...claves].filter((k) => !isDeepStrictEqual(igual[k], base[k]))
    problemas.push(
      `docs/plan.yaml: el carril ${nombre} cambia ${cambia.join(', ')}; sólo suma a su dueno_de; lo demás lo cambia el carril a.`,
    )
  }
  return { problemas, sumadas }
}

/** C6. @returns {string[]} */
export function problemasDeAlcance({ carril, plan, cambios, sumadas }) {
  const suyas = [...(carril.dueno_de ?? []), ...sumadas]
  const compartido = plan.compartido ?? []
  const problemas = []
  // De otro carril no base: la carpeta más precisa que la contiene es de un carril que no es el base ni éste.
  const deOtro = (ruta) => {
    let mejor = null
    for (const c of plan.carriles)
      for (const d of c.dueno_de ?? [])
        if (dentro(ruta, d) && (!mejor || d.length > mejor.d.length)) mejor = { c, d }
    return mejor && mejor.c.base !== true && mejor.c.id !== carril.id ? mejor.c.id : null
  }
  const del = (ruta, borrando) => {
    if (suyas.some((d) => dentro(ruta, d)) || ruta.startsWith('docs/')) return
    const otro = deOtro(ruta)
    if (!otro && !compartido.some((d) => dentro(ruta, d))) {
      if (borrando)
        problemas.push(
          `${ruta}: el carril ${carril.id} edita y agrega lo del núcleo, pero no lo borra; pídelo al carril a en docs/pasos/<paso>/ («Necesita del carril A»).`,
        )
      return
    }
    if (compartido.some((d) => dentro(ruta, d))) {
      if (borrando)
        problemas.push(
          `${ruta}: el carril ${carril.id} no borra en ${compartido.find((d) => dentro(ruta, d))} (docs/plan.yaml › compartido); pídelo al carril a en docs/pasos/<paso>/ («Necesita del carril A»).`,
        )
      return
    }
    problemas.push(
      `${ruta}: es del carril ${otro} (docs/plan.yaml › dueno_de), no del ${carril.id}; pídeselo con una compuerta \`espera\`.`,
    )
  }
  for (const c of cambios) {
    del(c.ruta, c.estado[0] === 'D')
    if (c.antes !== undefined && borra(c)) del(c.antes, true)
  }
  return problemas
}
