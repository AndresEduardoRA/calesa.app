'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePapeleraDeLeads } from '../../../composicion'
import type { ResultadoDeEnvio } from '../../../entities/papelera'
import { esquemaEnviarAPapelera } from '../schemas/papelera'

// Envía leads a la papelera: todo o nada, hasta 200, con el id del lote que trae el cliente. Sin el
// permiso no se intenta; sobre cuáles lo tiene (los suyos, o todos los que ve) lo decide la base.
export const enviarLeadsAPapelera = actionClient
  .inputSchema(esquemaEnviarAPapelera)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeEnvio>> => {
    if (!puede(ctx.permisos, 'leads.eliminar')) {
      return fallo('sin_permiso', 'No tienes permiso para enviar leads a la papelera.')
    }
    const resultado = await repositorioDePapeleraDeLeads.enviar(parsedInput)
    if (resultado.ok) {
      revalidatePath(RUTAS.leads, 'layout')
    }
    return resultado
  })
