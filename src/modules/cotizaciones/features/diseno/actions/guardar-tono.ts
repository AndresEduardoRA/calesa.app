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
import { esquemaGuardarTono } from '../schemas/tonos'

// Guarda el nombre o los colores de un tono (`tono_guardar`): sólo lo que cambió, con la versión que se tenía en pantalla (un PT409 si otra persona lo cambió).
export const guardarTono = actionClient
  .inputSchema(esquemaGuardarTono)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTonos>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TONOS)
    }
    const hecho = comoResultado(await repositorioDeTonos.guardar(parsedInput))
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeCotizacion)
    return hecho
  })
