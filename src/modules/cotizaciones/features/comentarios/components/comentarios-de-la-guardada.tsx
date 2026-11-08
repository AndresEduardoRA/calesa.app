import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { SeccionDeComentarios } from './seccion-de-comentarios'

// El hueco `Debajo` de la guardada (4.27-2): la sección de comentarios. Al navegador cruzan el id y si quien mira puede guardarla (lo que pide adjuntar, 4.27-3):
// la lista la lee la sección con la sesión de quien mira, y lo demás que puede (comentar pide ver; borrar o quitar lo ajeno, moderar) lo dice la base en esa lectura.
export function ComentariosDeLaGuardada({ cotizacion, puedeGuardar }: PropsDeUnHuecoDeLaGuardada) {
  return <SeccionDeComentarios cotizacionId={cotizacion.id} puedeAdjuntar={puedeGuardar} />
}
