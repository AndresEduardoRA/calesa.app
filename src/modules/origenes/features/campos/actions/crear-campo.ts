'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaCrearCampo } from '../schemas/campos'

// Un campo propio del origen: nace al final del layout y no es de sistema. Su clave no cambia
// después (los vehículos guardan sus valores con ella).
export const crearCampo = actionClient
  .inputSchema(esquemaCrearCampo)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const creado = await repositorioCampos.crear(parsedInput)
    if (creado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return creado
  })
