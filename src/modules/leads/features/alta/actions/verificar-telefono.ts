'use server'

import { fallo, type Resultado } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAlta } from '../../../composicion'
import type { Verificacion } from '../../../entities/verificacion'
import { esquemaVerificarTelefono } from '../schemas/alta'

// «¿Ya existe este teléfono, y de quién es?», mientras se tipea. Sólo para quien da de alta leads:
// sin el permiso no hay forma de preguntar de quién es un número.
export const verificarTelefono = actionClient
  .inputSchema(esquemaVerificarTelefono)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<Verificacion>> => {
    if (!puede(ctx.permisos, 'leads.crear')) {
      return fallo('sin_permiso', 'No tienes permiso para dar de alta leads.')
    }
    return repositorioDeAlta.verificar(parsedInput.telefono)
  })
