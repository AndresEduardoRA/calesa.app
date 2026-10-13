'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioFotos } from '../../../composicion'
import { exigirEdicionDeFotos, revalidarFotos } from '../permiso'
import { esquemaRestaurarFoto } from '../schemas/fotos'

// Deshacer un eliminar: la foto vuelve a su lugar y, si lo era, de portada. Sus objetos siguen
// en Storage (la limpieza espera 24 h) y salen de la cola al volver a tener fila.
export const restaurarFoto = actionClient
  .inputSchema(esquemaRestaurarFoto)
  .action(async ({ parsedInput, ctx }) => {
    const permitido = await exigirEdicionDeFotos(ctx.permisos, parsedInput.vehiculoId)
    if (!permitido.ok) {
      return permitido
    }
    const resultado = await repositorioFotos.agregar({
      vehiculoId: parsedInput.vehiculoId,
      fotos: [parsedInput.foto],
    })
    if (resultado.ok) {
      revalidarFotos(parsedInput.vehiculoId)
    }
    return resultado
  })
