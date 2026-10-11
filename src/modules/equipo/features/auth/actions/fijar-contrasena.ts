'use server'

import { redirigir } from '@/shared/lib/navegacion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioEquipo, servicioAcceso } from '../../../composicion'
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
    // Si llegó invitada, eligió su contraseña: la invitación deja de estar pendiente. Para quien
    // sólo recupera la suya no hace nada. Si esto falla no se le impide entrar: en la lista del
    // equipo seguiría figurando como pendiente, y queda en el log.
    const aceptada = await repositorioEquipo.aceptarInvitacion()
    if (!aceptada.ok) {
      console.error(`No se pudo aceptar la invitación: ${aceptada.error.mensaje}`)
    }
    redirigir(RUTAS.inicio)
  })
