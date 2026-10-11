'use server'

import { revalidatePath } from 'next/cache'
import { fallo, ok } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { guardarPerspectiva } from '../cookie'
import { esquemaVerComo } from '../schemas/perspectiva'

// Empezar a mirar la app como otro rol. `ctx.permisos` son los reales (salen de `mis_permisos()`,
// que no sabe de perspectivas): así se puede cambiar de rol aunque el actual no gestione roles.
// La base vuelve a decidirlo al calcular los permisos efectivos.
export const verComo = actionClient
  .inputSchema(esquemaVerComo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'equipo.roles.gestionar')) {
      return fallo(
        'sin_permiso',
        'Para ver la app como otro rol hace falta el permiso de gestionar roles.',
      )
    }
    await guardarPerspectiva(parsedInput.rolId)
    revalidatePath(RUTAS.inicio, 'layout')
    return ok(null)
  })
