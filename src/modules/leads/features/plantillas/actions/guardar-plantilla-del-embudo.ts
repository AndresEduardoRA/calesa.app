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
import { esquemaGuardarPlantillaDelEmbudo } from '../schemas/plantillas'

// Guarda la plantilla del embudo (o, con `etapas` nulas, vuelve a las de fábrica) con la versión que se tenía en pantalla. Los embudos
// que ya existen no cambian.
export const guardarPlantillaDelEmbudo = actionClient
  .inputSchema(esquemaGuardarPlantillaDelEmbudo)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ actualizadoEn: string }>> => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = comoResultado(
      await repositorioDeAjustesDeLeads.guardarPlantillaDelEmbudo(parsedInput),
    )
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
