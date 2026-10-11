'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioPerfil } from '../../../composicion'
import { esquemaPreferencia } from '../../../entities/preferencias'

// Sin `revalidatePath`: la preferencia ya está aplicada en el navegador de quien la cambió y el
// servidor la vuelve a leer en la próxima carga. Revalidar redibujaría toda la app por un clic.
export const guardarPreferencia = actionClient
  .inputSchema(esquemaPreferencia)
  .action(async ({ parsedInput, ctx }) =>
    repositorioPerfil.guardarPreferencia(ctx.usuarioId, parsedInput),
  )
