'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioFotos } from '../../../composicion'
import { exigirEdicionDeFotos, revalidarFotos } from '../permiso'
import { esquemaEliminarFoto } from '../schemas/fotos'

// Elimina una foto y devuelve cómo estaba, que es lo que «Deshacer» manda de vuelta. Sus objetos
// no se borran acá: quedan en la cola de limpieza, que espera 24 h.
export const eliminarFoto = actionClient
  .inputSchema(esquemaEliminarFoto)
  .action(async ({ parsedInput, ctx }) => {
    const permitido = await exigirEdicionDeFotos(ctx.permisos, parsedInput.vehiculoId)
    if (!permitido.ok) {
      return permitido
    }
    const resultado = await repositorioFotos.eliminar(parsedInput)
    if (resultado.ok) {
      revalidarFotos(parsedInput.vehiculoId)
    }
    return resultado
  })
