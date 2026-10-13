'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioFotos } from '../../../composicion'
import { exigirEdicionDeFotos, revalidarFotos } from '../permiso'
import { esquemaMoverFoto } from '../schemas/fotos'

// «Ponla después de X» (o primera): relativo, así que sigue bien aunque alguien haya sumado una
// foto mientras tanto. Con la versión de las fotos: si otra persona las cambió, `conflicto`.
export const moverFoto = actionClient
  .inputSchema(esquemaMoverFoto)
  .action(async ({ parsedInput, ctx }) => {
    const permitido = await exigirEdicionDeFotos(ctx.permisos, parsedInput.vehiculoId)
    if (!permitido.ok) {
      return permitido
    }
    const resultado = await repositorioFotos.mover(parsedInput)
    if (resultado.ok) {
      revalidarFotos(parsedInput.vehiculoId)
    }
    return resultado
  })
