import type { HuecosDeLaGuardada } from '../../hoja/components/huecos'
import { ComentariosDeLaGuardada } from './comentarios-de-la-guardada'

// Lo que el área `comentarios` llena en la guardada (`/cotizaciones/[id]`): bajo la hoja (`Debajo`), la sección de comentarios (4.27-2). La cabecera (`Acciones`)
// la llena el 4.27-4 (favorita, reportar y moderar).
export const HUECOS_DE_COMENTARIOS_EN_LA_GUARDADA: HuecosDeLaGuardada = {
  Debajo: ComentariosDeLaGuardada,
}
