'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { conCuentasInvitadas, leerPersona, repositorioRoles } from '../../../composicion'
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
    const leida = await leerPersona(parsedInput.personaId)
    if (!leida.ok) {
      return leida
    }
    const persona = leida.data
    if (!persona) {
      return fallo('no_encontrado', 'Esa persona ya no está en el equipo.')
    }
    const origen = await origenDelSitio()
    return conCuentasInvitadas((cuentas) =>
      enlaceParaInvitada({ cuentas, roles: repositorioRoles }, { persona, origen }),
    )
  })
