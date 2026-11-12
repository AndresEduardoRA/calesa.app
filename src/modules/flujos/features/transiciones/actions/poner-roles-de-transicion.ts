'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTransiciones } from '../../../areas/transiciones/composicion'
import type { VersionDeTransicion } from '../../../entities/transiciones/respuestas'
import { esquemaPonerRolesDeTransicion } from '../schemas/transiciones'
import {
  comoResultado,
  motivoSinPermisoDeTransiciones,
  sinPermisoDeTransiciones,
} from './resultado'

// Pone la lista de roles que pueden mover por una salida. Vacía: manda la lista de la fase destino. Acota, no otorga.
export const ponerRolesDeTransicion = actionClient
  .inputSchema(esquemaPonerRolesDeTransicion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionDeTransicion>> => {
    const motivo = motivoSinPermisoDeTransiciones(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeTransiciones(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeTransiciones.ponerRolesDeTransicion(pedido))
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
