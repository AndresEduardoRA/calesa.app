'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { conCuentasInvitadas, repositorioEquipo, repositorioRoles } from '../../../composicion'
import { origenDelSitio } from '../../auth/origen'
import { invitarPersona } from '../invitar'
import { esquemaInvitar } from '../schemas/equipo'

// Invitar a alguien por correo con un rol. `conCuentasInvitadas` vuelve a comprobar el permiso en
// la base antes de tocar la API de admin de Auth.
export const invitar = actionClient
  .inputSchema(esquemaInvitar)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.usuarios.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para invitar personas al equipo.')
    }
    const origen = await origenDelSitio()
    const hecha = await conCuentasInvitadas((cuentas) =>
      invitarPersona(
        { cuentas, roles: repositorioRoles, equipo: repositorioEquipo },
        { ...parsedInput, origen },
      ),
    )
    if (hecha.ok) {
      revalidatePath(RUTAS.equipo)
    }
    return hecha
  })
