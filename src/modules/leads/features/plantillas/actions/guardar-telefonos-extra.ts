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
import { esquemaGuardarTelefonosExtra } from '../schemas/plantillas'

// Guarda el máximo de teléfonos extra y si cuentan como el principal, con la versión que se tenía en pantalla. Los leads que ya tienen más
// que el nuevo máximo los conservan; la regla rige desde ahí para altas y ediciones.
export const guardarTelefonosExtra = actionClient
  .inputSchema(esquemaGuardarTelefonosExtra)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ actualizadoEn: string }>> => {
    if (!puede(ctx.permisos, 'leads.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_LEADS)
    }
    const hecho = comoResultado(
      await repositorioDeAjustesDeLeads.guardarAjustesDeTelefonos(parsedInput),
    )
    if (hecho.ok) {
      // La ficha y el resumen traen el máximo en cada lectura: no hay caché que revalidar fuera de esta pantalla.
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
