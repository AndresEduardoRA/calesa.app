'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTransiciones } from '../../../areas/transiciones/composicion'
import type { VersionDeTransicion } from '../../../entities/transiciones/respuestas'
import { esquemaEliminarTransicion } from '../schemas/transiciones'
import {
  comoResultado,
  motivoSinPermisoDeTransiciones,
  sinPermisoDeTransiciones,
} from './resultado'

// Quita una salida de su fase. Desde esa fase ya no se podrá mover ahí; no mueve a nadie. La pantalla lo confirma antes.
export const eliminarTransicion = actionClient
  .inputSchema(esquemaEliminarTransicion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionDeTransicion>> => {
    const motivo = motivoSinPermisoDeTransiciones(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeTransiciones(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeTransiciones.eliminar(pedido))
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
