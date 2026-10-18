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
import { esquemaGuardarTipo } from '../schemas/tipos'

// Renombra, activa o desactiva, con la versión que se tenía en pantalla.
export const guardarTipo = actionClient
  .inputSchema(esquemaGuardarTipo)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTipos>> => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = comoResultado(await repositorioDeTiposDeLead.guardar(parsedInput))
    if (hecho.ok) {
      // Los tipos se ofrecen en el alta (el layout), en los filtros del listado y en la ficha.
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
      revalidatePath(RUTAS.leads)
    }
    return hecho
  })
