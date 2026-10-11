'use server'

import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClientPublico } from '@/shared/lib/safe-action'
import { servicioAcceso } from '../../../composicion'

// Público a propósito: cerrar una sesión que ya venció tiene que funcionar igual.
export const cerrarSesion = actionClientPublico.action(async () => {
  await servicioAcceso.cerrarSesion()
  redirigir(RUTAS.ingreso)
})
