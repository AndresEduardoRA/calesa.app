import type { HuecosDeLaGuardada } from '../../hoja/components/huecos'
import { AprobadaDeLaGuardada } from './aprobada-de-la-guardada'

// Lo que el área `aprobada` llena en la guardada (`/cotizaciones/[id]`): la insignia «Aprobada» y «Aprobar» en la cabecera (`Insignias`). Nada en `Acciones` ni
// bajo la hoja.
export const HUECOS_DE_APROBADA_EN_LA_GUARDADA: HuecosDeLaGuardada = {
  Insignias: AprobadaDeLaGuardada,
}
