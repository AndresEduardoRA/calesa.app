'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAjustesDeLeads } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_LEADS } from '../../../entities/motivos'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaGuardarMensajeDelPortal } from '../schemas/plantillas'

// Guarda el mensaje del portal (o, con `texto` nulo, vuelve al de fábrica) con la versión que se tenía en pantalla.
export const guardarMensajeDelPortal = actionClient
  .inputSchema(esquemaGuardarMensajeDelPortal)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ actualizadoEn: string }>> => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = comoResultado(
      await repositorioDeAjustesDeLeads.guardarMensajeDelPortal(parsedInput),
    )
    if (hecho.ok) {
      // La sección «Portal» de la ficha lo lee al abrirse (`connection()`): no hay nada más que revalidar.
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
