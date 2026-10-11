'use server'

import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { servicioAcceso } from '../../../composicion'
import { esquemaNuevaContrasena } from '../schemas/acceso'

// Con sesión (la que deja el enlace de recuperación o de invitación): sin ella, `actionClient`
// responde «tu sesión venció» antes de llegar acá.
export const fijarContrasena = actionClient
  .inputSchema(esquemaNuevaContrasena)
  .action(async ({ parsedInput }) => {
    const cambio = await servicioAcceso.fijarContrasena(parsedInput.contrasena)
    if (!cambio.ok) {
      return cambio
    }
    redirigir(RUTAS.inicio)
  })
