'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTiposDeSeguimiento } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import type { RespuestaDeTiposDeSeguimiento } from '../../../entities/tipo-de-seguimiento'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaEliminarTipoDeSeguimiento } from '../schemas/tipos-de-seguimiento'

// Elimina uno sin seguimientos (con seguimientos se desactiva).
export const eliminarTipoDeSeguimiento = actionClient
  .inputSchema(esquemaEliminarTipoDeSeguimiento)
  .action(
    async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTiposDeSeguimiento>> => {
      if (!puede(ctx.permisos, 'leads.configurar')) {
        return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
      }
      const hecho = comoResultado(await repositorioDeTiposDeSeguimiento.eliminar(parsedInput))
      if (hecho.ok) {
        // Los tipos se ofrecen al anotar un seguimiento (la ficha, el rápido, el alta) y se nombran en la línea de tiempo.
        revalidatePath(RUTAS.configuracionDeLeads, 'layout')
        revalidatePath(RUTAS.leads)
      }
      return hecho
    },
  )
