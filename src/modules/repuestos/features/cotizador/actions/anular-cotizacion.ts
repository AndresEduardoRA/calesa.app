'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCotizaciones } from '../../../areas/cotizador/composicion'
import { rutaDeLaCotizacion } from '../../../entities/cotizador/cotizacion'
import { SIN_PERMISO_PARA_COTIZAR } from '../../../entities/cotizador/errores-de-cotizacion'
import type { CotizacionAnulada } from '../../../entities/cotizador/repositorio'
import { esquemaCerrarCotizacion } from '../schemas/guardar-cotizacion'

// Anular una cotización de repuestos, en borrador o aceptada (8.12-4, C8). No revierte los precios que ya pasaron a los ítems (D12 de 8.12-1). La RPC
// vuelve a exigir `repuestos.cotizar` y `repuestos.ver`. Se releen la hoja y el proyecto (la lista).
export const anularCotizacion = actionClient
  .inputSchema(esquemaCerrarCotizacion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CotizacionAnulada>> => {
    if (!puede(ctx.permisos, 'repuestos.cotizar') || !puede(ctx.permisos, 'repuestos.ver')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_COTIZAR)
    }
    const { proyectoId, id, actualizadoEn } = parsedInput
    const hecho = await repositorioDeCotizaciones.anular({ id, actualizadoEn })
    if (hecho.ok) {
      revalidatePath(rutaDeLaCotizacion(proyectoId, id))
      revalidatePath(`${RUTAS.repuestos}/${proyectoId}`)
    }
    return hecho
  })
