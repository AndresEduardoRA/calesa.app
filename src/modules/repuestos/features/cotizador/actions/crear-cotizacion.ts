'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCotizaciones } from '../../../areas/cotizador/composicion'
import { SIN_PERMISO_PARA_COTIZAR } from '../../../entities/cotizador/errores-de-cotizacion'
import type { CotizacionCreada } from '../../../entities/cotizador/repositorio'
import { esquemaCrearCotizacion } from '../schemas/crear-cotizacion'

// Crear una cotización de repuestos en borrador (8.12-3, C7). Sin `repuestos.cotizar` o sin `repuestos.ver` no llega a la base; la RPC lo vuelve a
// exigir. Si sale bien, la página del proyecto se vuelve a leer (la lista de la pestaña); un área no importa otra, así que la ruta se arma con `RUTAS`.
export const crearCotizacion = actionClient
  .inputSchema(esquemaCrearCotizacion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CotizacionCreada>> => {
    if (!puede(ctx.permisos, 'repuestos.cotizar') || !puede(ctx.permisos, 'repuestos.ver')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_COTIZAR)
    }
    const hecho = await repositorioDeCotizaciones.crear(parsedInput)
    if (hecho.ok) {
      revalidatePath(`${RUTAS.repuestos}/${parsedInput.proyectoId}`)
    }
    return hecho
  })
