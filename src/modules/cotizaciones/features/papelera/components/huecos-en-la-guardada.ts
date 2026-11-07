import type { HuecosDeLaGuardada } from '../../hoja/components/huecos'
import { EnviarLaGuardadaALaPapelera } from './enviar-a-papelera'

// Lo que el área `papelera` llena en la guardada (`/cotizaciones/[id]`, 4.24-3): «Enviar a la papelera» con «Deshacer» en la cabecera (`Acciones`). Bajo la hoja
// (`Debajo`) nada: enviar lleva al listado, donde «Papelera» está junto a «Nueva».
export const HUECOS_DE_PAPELERA_EN_LA_GUARDADA: HuecosDeLaGuardada = {
  Acciones: EnviarLaGuardadaALaPapelera,
}
