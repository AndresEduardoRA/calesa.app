'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { probadorDeRevalidacion } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'

// «Probar»: el servidor manda a la dirección guardada un pedido vacío con el secreto y dice qué
// código respondió. No recibe nada del navegador y no muta: sin `revalidatePath`.
export const probarWebPublica = actionClient.action(async ({ ctx }) => {
  if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
    return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
  }
  return probadorDeRevalidacion()
})
