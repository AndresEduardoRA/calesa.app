'use server'

import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClientPublico } from '@/shared/lib/safe-action'
import { servicioAcceso } from '../../../composicion'
import { borrarPerspectiva } from '../../perspectiva/cookie'

// Público a propósito: cerrar una sesión que ya venció tiene que funcionar igual.
export const cerrarSesion = actionClientPublico.action(async () => {
  await servicioAcceso.cerrarSesion()
  // La perspectiva «ver como» es de esta sesión: no la hereda quien ingrese después.
  await borrarPerspectiva()
  redirigir(RUTAS.ingreso)
})
