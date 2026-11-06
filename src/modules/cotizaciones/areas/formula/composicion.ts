// Composición del área `formula` de `cotizaciones` en el servidor: la pestaña «Fórmula» de Configuración › Cotización (4.20-2a) y lo que escribe (4.20-2b). Sale por la
// `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeLaFormula } from '../../entities/formula/repositorio'
import { publicacionSupabase } from '../../infra/formula/publicacion'
import { getFormulaDelOrigen } from '../../infra/formula/versiones'

// La publicada, el borrador y la primera página de versiones de un origen, con sus autores.
export const leerFormulaDelOrigen = getFormulaDelOrigen
// Publicar el borrador y revertir a una archivada, por las RPC del 4.20-1.
export const repositorioDeLaFormula: RepositorioDeLaFormula = publicacionSupabase
