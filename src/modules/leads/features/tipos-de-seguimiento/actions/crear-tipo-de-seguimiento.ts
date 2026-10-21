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
import { esquemaCrearTipoDeSeguimiento } from '../schemas/tipos-de-seguimiento'

// Crea uno al final de la lista, con el id del intento: repetirlo devuelve el mismo.
export const crearTipoDeSeguimiento = actionClient
  .inputSchema(esquemaCrearTipoDeSeguimiento)
  .action(
    async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeTiposDeSeguimiento>> => {
      if (!puede(ctx.permisos, 'leads.configurar')) {
        return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
      }
      const hecho = comoResultado(await repositorioDeTiposDeSeguimiento.crear(parsedInput))
      if (hecho.ok) {
        // Los tipos se ofrecen al anotar un seguimiento (la ficha, el rápido, el alta) y se nombran en la línea de tiempo.
        revalidatePath(RUTAS.configuracionDeLeads, 'layout')
        revalidatePath(RUTAS.leads)
      }
      return hecho
    },
  )
