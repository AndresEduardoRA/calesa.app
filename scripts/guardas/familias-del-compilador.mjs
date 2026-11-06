// Las familias del compilador de la fórmula y los validadores de `cotizaciones`: núcleo (los importan otros archivos del núcleo, y
// `validar-diseno*` importa `validarFormula`), pero los edita el carril B archivo por archivo (P2 del 4.15-4, `docs/DECISIONES.md`, paso
// 4.15-4): un archivo nuevo de estas familias hace caer la guarda de áreas hasta que el mismo PR lo sume a su `dueno_de`. Viven en un
// `.mjs` para que también las lea la guarda de carriles (`carriles-plan.mjs`), que corre con `node` a secas. Una sola fuente.
export const MODULO_DEL_COMPILADOR = 'src/modules/cotizaciones/'

export const FAMILIAS_DEL_COMPILADOR =
  /^entities\/((compilador|validar)([a-z-]*)|motivos-de-(formula|diseno)|motivos-del-compilador)(\.test)?\.ts$|^entities\/casos-(de-formula|de-diseno|del-compilador)\.json$/
