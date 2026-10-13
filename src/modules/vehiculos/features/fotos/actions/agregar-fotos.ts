'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioFotos } from '../../../composicion'
import { exigirEdicionDeFotos, revalidarFotos } from '../permiso'
import { esquemaAgregarFotos } from '../schemas/fotos'

// Registra las fotos que el navegador ya subió a Storage. No lleva versión (sumar no pisa a
// nadie) y es idempotente por hash: reintentar tras perder la respuesta no duplica. Con más fotos
// de las que caben, la base acepta las primeras y devuelve el resto en `sinLugar`.
export const agregarFotos = actionClient
  .inputSchema(esquemaAgregarFotos)
  .action(async ({ parsedInput, ctx }) => {
    const permitido = await exigirEdicionDeFotos(ctx.permisos, parsedInput.vehiculoId)
    if (!permitido.ok) {
      return permitido
    }
    const resultado = await repositorioFotos.agregar(parsedInput)
    if (resultado.ok) {
      revalidarFotos(parsedInput.vehiculoId)
    }
    return resultado
  })
