import type { HuecosDeLaGuardada } from '../../hoja/components/huecos'
import { ComentariosDeLaGuardada } from './comentarios-de-la-guardada'
import { InsigniaDeLaGuardada } from './insignia-de-la-guardada'
import { MarcasDeLaGuardada } from './marcas-de-la-guardada'

// Lo que el área `comentarios` llena en la guardada (`/cotizaciones/[id]`): bajo la hoja (`Debajo`), la sección de comentarios (4.27-2); en la cabecera, «Favorita»,
// «Reportar…» y las acciones de moderar (`Acciones`) y la insignia «Reportada» o «Inválida» (`Insignias`, 4.27-4).
export const HUECOS_DE_COMENTARIOS_EN_LA_GUARDADA: HuecosDeLaGuardada = {
  Acciones: MarcasDeLaGuardada,
  Insignias: InsigniaDeLaGuardada,
  Debajo: ComentariosDeLaGuardada,
}
