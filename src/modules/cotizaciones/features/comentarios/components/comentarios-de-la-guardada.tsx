import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { SeccionDeComentarios } from './seccion-de-comentarios'

// El hueco `Debajo` de la guardada (4.27-2): la sección de comentarios. Al navegador sólo cruza el id: la lista la lee la sección con la sesión de quien mira, y
// lo que puede (comentar pide ver; borrar lo ajeno, moderar) lo dice la base en esa lectura.
export function ComentariosDeLaGuardada({ cotizacion }: PropsDeUnHuecoDeLaGuardada) {
  return <SeccionDeComentarios cotizacionId={cotizacion.id} />
}
