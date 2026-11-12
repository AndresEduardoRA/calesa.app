'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCotizaciones } from '../../../areas/cotizador/composicion'
import { rutaDeLaCotizacion } from '../../../entities/cotizador/cotizacion'
import { SIN_PERMISO_PARA_ACEPTAR } from '../../../entities/cotizador/errores'
import type { CotizacionAceptada } from '../../../entities/cotizador/repositorio'
import { esquemaCerrarCotizacion } from '../schemas/guardar-cotizacion'

// Aceptar una cotización de repuestos (8.12-4, C8): fija el precio de los ítems, así que pide además `repuestos.editar` (D13 de 8.12-1). La RPC lo
// vuelve a exigir, anula la aceptada anterior y copia el unitario a cada ítem. Se releen la hoja y el proyecto (la lista y los precios).
export const aceptarCotizacion = actionClient
  .inputSchema(esquemaCerrarCotizacion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CotizacionAceptada>> => {
    const permisos = ['repuestos.cotizar', 'repuestos.ver', 'repuestos.editar'] as const
    if (!permisos.every((p) => puede(ctx.permisos, p))) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_ACEPTAR)
    }
    const { proyectoId, id, actualizadoEn } = parsedInput
    const hecho = await repositorioDeCotizaciones.aceptar({ id, actualizadoEn })
    if (hecho.ok) {
      revalidatePath(rutaDeLaCotizacion(proyectoId, id))
      revalidatePath(`${RUTAS.repuestos}/${proyectoId}`)
    }
    return hecho
  })
