'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTransiciones } from '../../../areas/transiciones/composicion'
import type { VersionDeTransicion } from '../../../entities/transiciones/respuestas'
import { esquemaCrearTransicion } from '../schemas/transiciones'
import {
  comoResultado,
  motivoSinPermisoDeTransiciones,
  sinPermisoDeTransiciones,
} from './resultado'

// Agrega una salida a una fase, con el id del intento: repetirlo dice «ya existe».
export const crearTransicion = actionClient
  .inputSchema(esquemaCrearTransicion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionDeTransicion>> => {
    const motivo = motivoSinPermisoDeTransiciones(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeTransiciones(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeTransiciones.crear(pedido))
    if (hecho.ok) {
      // La pantalla relee el flujo: ninguna RPC lo devuelve.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
