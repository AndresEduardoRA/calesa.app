'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioRoles } from '../../../composicion'
import { claveDeRol } from '../../../entities/rol'
import { esquemaCrearRol } from '../schemas/roles'

export const crearRol = actionClient
  .inputSchema(esquemaCrearRol)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.roles.gestionar')) {
      return fallo('sin_permiso', 'No tienes permiso para crear roles.')
    }
    const clave = claveDeRol(parsedInput.nombre)
    if (!clave) {
      return fallo('validacion', 'Usa un nombre con letras, como «Ventas» o «Logística».')
    }
    const creado = await repositorioRoles.crear({ ...parsedInput, clave })
    if (creado.ok) {
      revalidatePath(RUTAS.roles)
    }
    return creado
  })
