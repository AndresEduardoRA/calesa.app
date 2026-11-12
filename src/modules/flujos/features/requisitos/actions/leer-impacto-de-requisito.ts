'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { leerImpactoDeRequisito as leer } from '../../../areas/requisitos/composicion'
import type { ImpactoDeRequisito } from '../../../entities/requisitos/impacto'
import { esquemaLeerImpacto } from '../schemas/requisitos'
import { motivoSinPermisoDeRequisitos, sinPermisoDeRequisitos } from './resultado'

// Cuántas unidades de la fase quedarían fuera de regla si el requisito se volviera bloqueante. Sólo lee y no relee la ruta: el cliente lo pide al encender el
// interruptor, antes de guardar.
export const leerImpactoDeRequisito = actionClient
  .inputSchema(esquemaLeerImpacto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ImpactoDeRequisito>> => {
    const motivo = motivoSinPermisoDeRequisitos(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeRequisitos(motivo)
    }
    const lectura = await leer({ requisitoId: parsedInput.id })
    return lectura.ok ? lectura : { ok: false, error: lectura.error }
  })
