import type { HuecosDeLaGuardada } from '../../hoja/components/huecos'
import { ComprobantesDeLaGuardada } from './comprobantes-de-la-guardada'
import { EmitirEnLaGuardada } from './emitir-en-la-guardada'

// Lo que el área `comprobantes` llena en la guardada (`/cotizaciones/[id]`, 4.26-2): «Emitir comprobante» en la cabecera (`Acciones`), con su confirmación en la
// URL, y la sección «Comprobantes» bajo la hoja (`Debajo`), con «Anular» en el vigente.
export const HUECOS_DE_COMPROBANTES_EN_LA_GUARDADA: HuecosDeLaGuardada = {
  Acciones: EmitirEnLaGuardada,
  Debajo: ComprobantesDeLaGuardada,
}
