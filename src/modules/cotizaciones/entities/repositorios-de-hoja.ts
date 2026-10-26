import type { Resultado } from '@/shared/lib/errores'
import type { HojaParaCotizar } from './hoja'

// La hoja de cotizar de un origen (`cotizacion_hoja()`, paso 4.13): una sola lectura al abrirla, con el diseño recortado al nivel de quien mira, la versión de la fórmula y la
// hora de la base (para `cotizacion_crear`, D2) o «sin publicar». Pide `cotizaciones.crear` del origen.
export type LectorDeHoja = (origenId: string) => Promise<Resultado<HojaParaCotizar>>
