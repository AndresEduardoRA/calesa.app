// Composición del área `plantilla` de `cotizaciones` en el servidor (4.15-4): lo que lee y escribe el editor de la plantilla de la tarjeta. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { leerPlantillaDelOrigen as leerLaPlantillaDelOrigen } from '../../infra/plantilla/lectura'

// El borrador, la publicada y lo que las valida (la fórmula publicada y el catálogo de tonos) de un origen, con la sesión de quien mira (4.19-3a).
export const leerPlantillaDelOrigen = leerLaPlantillaDelOrigen
