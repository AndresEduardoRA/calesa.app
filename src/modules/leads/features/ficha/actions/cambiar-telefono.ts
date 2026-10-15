'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTelefonos } from '../../../composicion'
import type { CambioDeTelefono } from '../../../entities/telefonos'
import { esquemaCambiarTelefono } from '../schemas/telefonos'

// Cambia el teléfono principal de un lead: sólo quien lo tiene en su cartera (la base lo decide;
// acá se comprueba el permiso). Un número que ya existe vuelve como valor, sin cambiar nada. Cuando
// cambia, la ficha y el listado se vuelven a dibujar en esta misma respuesta: la versión del lead
// y el número viajan juntos, sin pedir la ficha aparte.
export const cambiarTelefono = actionClient
  .inputSchema(esquemaCambiarTelefono)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CambioDeTelefono>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar leads.')
    }
    const cambiado = await repositorioDeTelefonos.cambiar(parsedInput)
    if (!cambiado.ok) {
      const { campo, error } = cambiado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    if (cambiado.data.resultado === 'cambiado') {
      revalidatePath(`${RUTAS.leads}/${parsedInput.id}`)
      revalidatePath(RUTAS.leads)
    }
    return cambiado
  })
