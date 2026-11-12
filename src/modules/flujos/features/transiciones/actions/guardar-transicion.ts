'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTransiciones } from '../../../areas/transiciones/composicion'
import type { VersionDeTransicion } from '../../../entities/transiciones/respuestas'
import { esquemaGuardarTransicion } from '../schemas/transiciones'
import {
  comoResultado,
  motivoSinPermisoDeTransiciones,
  sinPermisoDeTransiciones,
} from './resultado'

// Cambia la acción o la nota de una salida (sólo lo que cambió). El destino no cambia: se quita la salida y se crea otra.
export const guardarTransicion = actionClient
  .inputSchema(esquemaGuardarTransicion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionDeTransicion>> => {
    const motivo = motivoSinPermisoDeTransiciones(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeTransiciones(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeTransiciones.guardar(pedido))
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
