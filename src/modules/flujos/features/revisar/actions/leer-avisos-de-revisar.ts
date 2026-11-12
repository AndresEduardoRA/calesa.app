'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { leerAvisosDeRevision as leer } from '../../../areas/revisar/composicion'
import type { AvisoDeRevision } from '../../../entities/revisar/avisos'
import { esquemaLeerAvisos } from '../schemas/leer-avisos'

// Los avisos de «Revisar» de un flujo: la franja (hueco de cliente, sólo recibe `{flujo}`) los pide al montarse y tras cada guardado. Sólo lee y no relee la
// ruta. Quien configura el flujo (`flujos.configurar`, o `repuestos.configurar` para el de repuestos); el origen lo decide la base, que a los demás no les da filas.
export const leerAvisosDeRevisar = actionClient
  .inputSchema(esquemaLeerAvisos)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<ResultadoDeAccion<{ avisos: AvisoDeRevision[]; hayMas: boolean }>> => {
      const clave =
        parsedInput.ambito === 'repuestos' ? 'repuestos.configurar' : 'flujos.configurar'
      if (!puede(ctx.permisos, clave)) {
        return fallo('sin_permiso', 'No puedes revisar este flujo.')
      }
      const lectura = await leer({ flujoId: parsedInput.flujoId })
      return lectura.ok ? lectura : { ok: false, error: lectura.error }
    },
  )
