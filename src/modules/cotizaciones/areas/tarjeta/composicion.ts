// Composición del área `tarjeta` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { getAsesorDeLaCotizacion } from '../../infra/tarjeta/asesor-de-la-cotizacion'

// A quien creó una cotización guardada, para «Asesor:» de su tarjeta (4.18-2, P2 a).
export const leerAsesorDeLaCotizacion = getAsesorDeLaCotizacion
