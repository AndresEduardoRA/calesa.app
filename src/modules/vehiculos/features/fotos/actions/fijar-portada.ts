'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioFotos } from '../../../composicion'
import { exigirEdicionDeFotos, revalidarFotos } from '../permiso'
import { esquemaFijarPortada } from '../schemas/fotos'

// La portada es una sola: es la que muestran el listado y la cabecera de la ficha.
export const fijarPortada = actionClient
  .inputSchema(esquemaFijarPortada)
  .action(async ({ parsedInput, ctx }) => {
    const permitido = await exigirEdicionDeFotos(ctx.permisos, parsedInput.vehiculoId)
    if (!permitido.ok) {
      return permitido
    }
    const resultado = await repositorioFotos.fijarPortada(parsedInput)
    if (resultado.ok) {
      revalidarFotos(parsedInput.vehiculoId)
    }
    return resultado
  })
