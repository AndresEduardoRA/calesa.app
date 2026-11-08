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
import { esquemaCrearTono } from '../schemas/tonos'

// Crea un tono del catálogo (`tono_crear`), con el id del intento: repetirlo devuelve el mismo. El catálogo es de la empresa: el permiso se pide sin origen y la base lo vuelve a pedir.
export const crearTono = actionClient
  .inputSchema(esquemaCrearTono)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTonos>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TONOS)
    }
    const hecho = comoResultado(await repositorioDeTonos.crear(parsedInput))
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeCotizacion)
    return hecho
  })
