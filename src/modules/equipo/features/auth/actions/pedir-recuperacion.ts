'use server'

import { ok } from '@/shared/lib/errores'
import { actionClientPublico } from '@/shared/lib/safe-action'
import { servicioAcceso } from '../../../composicion'
import { esquemaRecuperar } from '../schemas/acceso'

export const pedirRecuperacion = actionClientPublico
  .inputSchema(esquemaRecuperar)
  .action(async ({ parsedInput }) => {
    const pedido = await servicioAcceso.pedirRecuperacion(parsedInput.email)
    // Lo único que se informa es el límite de envíos. Que el correo exista o no, nunca: la
    // pantalla dice lo mismo en los dos casos.
    if (!pedido.ok && pedido.error.codigo === 'regla') {
      return pedido
    }
    return ok({ email: parsedInput.email })
  })
