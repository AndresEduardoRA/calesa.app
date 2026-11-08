'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeComprobantes } from '../../../areas/comprobantes/composicion'
import { puedeAnularComprobantes } from '../../../entities/comprobantes/acceso'
import type { ComprobanteAnulado } from '../../../entities/comprobantes/repositorio'
import { esquemaAnularComprobante } from '../schemas/comprobantes'

// Anula un comprobante con su motivo (4.26-2). Sin la clave no se llama a la base; ver la cotización y si ya estaba anulado los mira la base. No revalida: el
// modal vuelve a pedir la página (`router.refresh()`).
export const anularComprobante = actionClient
  .inputSchema(esquemaAnularComprobante)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ComprobanteAnulado>> => {
    if (!puedeAnularComprobantes(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para anular comprobantes.')
    }
    return repositorioDeComprobantes.anular(parsedInput.comprobanteId, parsedInput.motivo)
  })
