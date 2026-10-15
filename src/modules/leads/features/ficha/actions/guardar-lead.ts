'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFicha } from '../../../composicion'
import { esquemaGuardarLead } from '../schemas/guardar'

// Guarda lo que cambió en la ficha de un lead, con la versión que tenía en pantalla quien edita: si
// otra persona lo cambió, la base responde `conflicto` diciendo quién y cuándo, y no se pisa nada.
// El permiso se comprueba acá y de nuevo en `lead_guardar()`, que además mira la cartera.
export const guardarLead = actionClient
  .inputSchema(esquemaGuardarLead)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ actualizadoEn: string }>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar leads.')
    }
    const { id, actualizadoEnEsperado, cambios } = parsedInput
    const guardado = await repositorioDeFicha.guardar({ id, actualizadoEnEsperado, cambios })
    if (!guardado.ok) {
      const { campo, error } = guardado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    revalidatePath(`${RUTAS.leads}/${id}`)
    revalidatePath(RUTAS.leads)
    return guardado
  })
