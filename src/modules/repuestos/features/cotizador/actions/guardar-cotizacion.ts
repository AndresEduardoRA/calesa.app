'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCotizaciones } from '../../../areas/cotizador/composicion'
import { rutaDeLaCotizacion } from '../../../entities/cotizador/cotizacion'
import { SIN_PERMISO_PARA_COTIZAR } from '../../../entities/cotizador/errores-de-cotizacion'
import type { CotizacionGuardada } from '../../../entities/cotizador/repositorio'
import { esquemaGuardarCotizacion } from '../schemas/guardar-cotizacion'

// Guardar las líneas y las notas de una cotización de repuestos en borrador (8.12-4, C8). Sin `repuestos.cotizar` o sin `repuestos.ver` no llega a la
// base; la RPC lo vuelve a exigir y recalcula cada total. Si sale bien, la hoja se vuelve a leer y nace de lo guardado (D45).
export const guardarCotizacion = actionClient
  .inputSchema(esquemaGuardarCotizacion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CotizacionGuardada>> => {
    if (!puede(ctx.permisos, 'repuestos.cotizar') || !puede(ctx.permisos, 'repuestos.ver')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_COTIZAR)
    }
    const { proyectoId, ...pedido } = parsedInput
    const hecho = await repositorioDeCotizaciones.guardar(pedido)
    if (hecho.ok) revalidatePath(rutaDeLaCotizacion(proyectoId, parsedInput.id))
    return hecho
  })
