'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioTiposCambio } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { esquemaCrearMoneda } from '../schemas/tipos-cambio'

export const crearMoneda = actionClient
  .inputSchema(esquemaCrearMoneda)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.tipos_cambio.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_TIPOS_CAMBIO)
    }
    const creada = await repositorioTiposCambio.crearMoneda(parsedInput)
    if (creada.ok) {
      revalidatePath(RUTAS.empresa)
    }
    return creada
  })
