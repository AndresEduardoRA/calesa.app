'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTelefonos } from '../../../composicion'
import type { CambioDeExtras } from '../../../entities/telefonos'
import { esquemaGuardarTelefonoExtra } from '../schemas/telefonos'

// Agrega, rotula o restituye un teléfono extra, por su id. No mueve la versión del lead ni vuelve a
// dibujar la ficha: la respuesta trae la lista completa y la pantalla la pone en su lugar. Con «los teléfonos extra cuentan como el
// principal» encendida y el número en otro lead, la respuesta es el choque (un valor), sin escribir.
export const guardarTelefonoExtra = actionClient
  .inputSchema(esquemaGuardarTelefonoExtra)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CambioDeExtras>> => {
    if (!puede(ctx.permisos, 'leads.telefonos_extra.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar los teléfonos extra.')
    }
    const guardado = await repositorioDeTelefonos.guardarExtra(parsedInput)
    if (!guardado.ok) {
      const { campo, error } = guardado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    return guardado
  })
