'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioTiposCambio } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { claveDeTipoCambio } from '../../../entities/tipos-cambio'
import { esquemaCrearTipoCambio } from '../schemas/tipos-cambio'

// Un tipo de cambio nuevo. Su clave sale del nombre y no cambia después: la nombran las fórmulas.
export const crearTipoCambio = actionClient
  .inputSchema(esquemaCrearTipoCambio)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.tipos_cambio.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_TIPOS_CAMBIO)
    }
    const clave = claveDeTipoCambio(parsedInput.nombre)
    if (!clave) {
      return fallo('validacion', 'El nombre tiene que empezar con una letra.')
    }
    const creado = await repositorioTiposCambio.crear({ ...parsedInput, clave })
    if (creado.ok) {
      // Los tipos de cambio vigentes están en la barra superior de toda la app.
      revalidatePath(RUTAS.inicio, 'layout')
    }
    return creado
  })
