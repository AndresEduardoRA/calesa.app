// Composición del área `formula` de `cotizaciones` en el servidor: la pestaña «Fórmula» de Configuración › Cotización (4.20-2a). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { getFormulaDelOrigen } from '../../infra/formula/versiones'

// La publicada, el borrador y la primera página de versiones de un origen, con sus autores.
export const leerFormulaDelOrigen = getFormulaDelOrigen
