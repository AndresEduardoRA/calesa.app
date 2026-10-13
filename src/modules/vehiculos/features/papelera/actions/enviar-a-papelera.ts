'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioPapelera } from '../../../composicion'
import { revalidarInventario } from '../revalidar'
import { esquemaEnviarAPapelera } from '../schemas/papelera'

// Envía vehículos a la papelera, cada uno con la versión que tenía en pantalla. Un envío es un
// lote. El resultado es parcial: los que la base no deja pasar (sin permiso sobre ése, vinculado
// a un lead, fuera de su fase inicial, cambiado por otra persona…) vuelven con su motivo.
export const enviarAPapelera = actionClient
  .inputSchema(esquemaEnviarAPapelera)
  .action(async ({ parsedInput, ctx }) => {
    // Sin el permiso en ningún origen, ni se intenta. Sobre cuáles lo tiene lo decide la base.
    if (!puede(ctx.permisos, 'vehiculos.eliminar')) {
      return fallo('sin_permiso', 'No tienes permiso para enviar vehículos a la papelera.')
    }
    const resultado = await repositorioPapelera.enviar(parsedInput.vehiculos)
    // También cuando no entró ninguno: si otra persona los cambió, la pantalla quedó vieja.
    revalidarInventario()
    return resultado
  })
