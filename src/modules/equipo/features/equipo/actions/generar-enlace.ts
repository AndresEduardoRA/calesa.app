'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { conCuentasInvitadas, leerEquipo } from '../../../composicion'
import { origenDelSitio } from '../../auth/origen'
import { enlaceParaInvitada } from '../invitar'
import { esquemaPersona } from '../schemas/equipo'

// Un enlace nuevo para alguien con la invitación pendiente. Invalida el anterior.
export const generarEnlace = actionClient
  .inputSchema(esquemaPersona)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.usuarios.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para invitar personas al equipo.')
    }
    const equipo = await leerEquipo()
    if (!equipo.ok) {
      return equipo
    }
    const persona = equipo.data.find((una) => una.id === parsedInput.personaId)
    if (!persona) {
      return fallo('no_encontrado', 'Esa persona ya no está en el equipo.')
    }
    const origen = await origenDelSitio()
    return conCuentasInvitadas((cuentas) => enlaceParaInvitada(cuentas, { persona, origen }))
  })
