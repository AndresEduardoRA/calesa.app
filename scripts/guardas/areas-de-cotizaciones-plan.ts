// La coherencia entre `docs/plan.yaml` y las áreas de `cotizaciones` (`areas-de-cotizaciones.ts`; la prueba, en
// `areas-de-cotizaciones.test.ts`). Un carril que no es `base` posee áreas enteras, con sus cinco lugares, y ningún archivo del núcleo,
// salvo las familias del compilador: las posee un solo carril, y todas las que hay en el árbol (P2 del 4.15-4).
import { MODULO, claseDe } from './areas-de-cotizaciones'
import { FAMILIAS_DEL_COMPILADOR } from './familias-del-compilador.mjs'

// Las familias del compilador (núcleo que edita el carril B archivo por archivo, P2 del 4.15-4) viven en `familias-del-compilador.mjs`,
// que también lee la guarda de carriles: una sola fuente.
export { FAMILIAS_DEL_COMPILADOR } from './familias-del-compilador.mjs'

type Carril = { id?: unknown; base?: unknown; dueno_de?: unknown }

const duenoDe = (carril: Carril | undefined): string[] =>
  Array.isArray(carril?.dueno_de) ? carril.dueno_de.map(String) : []

const LUGARES = (area: string) => [
  `features/${area}/`,
  `entities/${area}/`,
  `infra/${area}/`,
  `areas/${area}/`,
  `pantallas/${area}.ts`,
]

// Lo que posee un carril que no es `base` dentro del módulo: sus áreas, si posee familias del compilador y lo que no puede poseer.
function loQuePosee(carril: Carril): {
  areas: Set<string>
  familias: boolean
  problemas: string[]
} {
  const id = String(carril.id)
  const areas = new Set<string>()
  const problemas: string[] = []
  let familias = false
  for (const ruta of duenoDe(carril).filter((r) => r.startsWith(MODULO))) {
    const rel = ruta.slice(MODULO.length)
    const clase = claseDe(rel)
    if (clase.tipo === 'area') {
      areas.add(clase.area)
    } else if (FAMILIAS_DEL_COMPILADOR.test(rel)) {
      familias = true
    } else {
      const que = clase.tipo === 'sin-dueno' ? 'una carpeta sin dueño' : 'del núcleo'
      problemas.push(`carril ${id}: posee ${ruta}, que es ${que}: el núcleo es del carril base`)
    }
  }
  return { areas, familias, problemas }
}

/** Lo que rompe la coherencia del plan con las áreas. `rutasDelModulo`: los archivos del árbol, desde la raíz del repo. */
export function problemasDelPlanDeAreas(
  plan: { carriles: readonly Carril[] },
  rutasDelModulo: readonly string[],
): string[] {
  const p: string[] = []
  const duenosDeFamilias: Carril[] = []
  for (const carril of plan.carriles.filter((c) => c.base !== true)) {
    const posee = loQuePosee(carril)
    p.push(...posee.problemas)
    if (posee.familias) duenosDeFamilias.push(carril)
    for (const area of [...posee.areas].sort()) {
      const faltan = LUGARES(area).filter((l) => !duenoDe(carril).includes(`${MODULO}${l}`))
      p.push(
        ...faltan.map(
          (l) => `carril ${String(carril.id)}: posee el área ${area} pero no ${MODULO}${l}`,
        ),
      )
    }
  }
  if (duenosDeFamilias.length > 1) {
    p.push(
      `las familias del compilador las poseen varios carriles (${duenosDeFamilias.map((c) => String(c.id)).join(', ')}): las posee uno solo`,
    )
  }
  const [dueno] = duenosDeFamilias
  if (dueno !== undefined) {
    const familias = rutasDelModulo
      .filter((r) => r.startsWith(MODULO) && FAMILIAS_DEL_COMPILADOR.test(r.slice(MODULO.length)))
      .filter((r) => !duenoDe(dueno).includes(r))
    p.push(
      ...familias.map(
        (r) =>
          `carril ${String(dueno.id)}: no posee ${r}, de las familias del compilador: súmalo a su dueno_de en docs/plan.yaml`,
      ),
    )
  }
  return p
}
