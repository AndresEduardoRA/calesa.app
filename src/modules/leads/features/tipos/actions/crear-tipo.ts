'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTiposDeLead } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import type { RespuestaDeTipos } from '../../../entities/tipo-de-lead'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaCrearTipo } from '../schemas/tipos'

// Crea uno al final de la lista, con el id del intento: repetirlo devuelve el mismo.
export const crearTipo = actionClient
  .inputSchema(esquemaCrearTipo)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTipos>> => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = comoResultado(await repositorioDeTiposDeLead.crear(parsedInput))
    if (hecho.ok) {
      // Los tipos se ofrecen en el alta (el layout), en los filtros del listado y en la ficha.
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
      revalidatePath(RUTAS.leads)
    }
    return hecho
  })
