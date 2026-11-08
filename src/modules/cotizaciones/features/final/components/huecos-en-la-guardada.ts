import type { HuecosDeLaGuardada } from '../../hoja/components/huecos'
import { MarcarLaGuardadaFinal } from './marcar-la-guardada-final'

// Lo que el área `final` llena en la guardada (`/cotizaciones/[id]`, 4.25-2): «Marcar final» en la cabecera (`Acciones`), con su confirmación en la URL. Bajo
// la hoja (`Debajo`) nada.
export const HUECOS_DE_FINAL_EN_LA_GUARDADA: HuecosDeLaGuardada = {
  Acciones: MarcarLaGuardadaFinal,
}
