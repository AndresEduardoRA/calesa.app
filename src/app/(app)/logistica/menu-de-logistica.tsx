import { requerirSesion } from '@/modules/equipo'
import { enlacesDeLogistica } from './enlaces'
import { SubNavegacion } from './sub-navegacion'

// Lee la sesión, así que va tras un `<Suspense>`. Con un solo enlace (Cadena) no hay nada que elegir: no dibuja la barra.
export async function MenuDeLogistica() {
  const sesion = await requerirSesion()
  const enlaces = enlacesDeLogistica(sesion.permisos)
  return enlaces.length > 1 ? <SubNavegacion enlaces={enlaces} /> : null
}
