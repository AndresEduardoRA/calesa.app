'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRequisitos } from '../../../areas/requisitos/composicion'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import { esquemaCrearRequisitoDeDato } from '../schemas/requisitos'
import { comoResultado, motivoSinPermisoDeRequisitos, sinPermisoDeRequisitos } from './resultado'

// Crea un requisito de dato al final de la fase, informativo, con el id del intento: repetirlo dice «ya existe».
export const crearRequisitoDeDato = actionClient
  .inputSchema(esquemaCrearRequisitoDeDato)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionNueva>> => {
    const motivo = motivoSinPermisoDeRequisitos(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeRequisitos(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeRequisitos.crearDato(pedido))
    if (hecho.ok) {
      // La pantalla relee el flujo: ninguna RPC lo devuelve.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
