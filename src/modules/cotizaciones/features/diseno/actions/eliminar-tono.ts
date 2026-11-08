'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTonos } from '../../../areas/diseno/composicion'
import type { RespuestaDeTonos } from '../../../entities/diseno/respuesta-de-tonos'
import { MOTIVO_SIN_PERMISO_DE_TONOS } from '../../../entities/diseno/tonos'
import { comoResultado } from '../../niveles/actions/resultado'
import { esquemaEliminarTono } from '../schemas/tonos'

// Elimina un tono (`tono_eliminar`). Uno que alguna versión de una fórmula nombra no se elimina: la base responde 23503 con cuál lo usa y llega tal cual.
export const eliminarTono = actionClient
  .inputSchema(esquemaEliminarTono)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTonos>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TONOS)
    }
    const hecho = comoResultado(await repositorioDeTonos.eliminar(parsedInput))
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeCotizacion)
    return hecho
  })
