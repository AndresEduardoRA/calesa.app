'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTelefonos } from '../../../composicion'
import type { CambioDeExtras } from '../../../entities/telefonos'
import { esquemaQuitarTelefonoExtra } from '../schemas/telefonos'

// Quita un teléfono extra y devuelve lo que quitó (con su etiqueta y su lugar) para que «Deshacer»
// lo restituya tal cual. Quitar uno que ya no está no es un error: no cambia nada.
export const quitarTelefonoExtra = actionClient
  .inputSchema(esquemaQuitarTelefonoExtra)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CambioDeExtras>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar leads.')
    }
    const quitado = await repositorioDeTelefonos.quitarExtra(parsedInput)
    if (!quitado.ok) {
      return { ok: false, error: quitado.error }
    }
    return quitado
  })
