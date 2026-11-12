'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeValores } from '../../../areas/catalogos/composicion'
import { SIN_PERMISO_PARA_LOS_CATALOGOS } from '../../../entities/catalogos/errores'
import { esquemaEliminarValor } from '../schemas/valor'

// Borra un valor sin uso (8.08-2): uno en uso lo rechaza la base (23514, `en_uso`) con el texto que dice desactivarlo. El permiso se mira antes de escribir (D26); lo que protege es la RLS.
export const eliminarValor = actionClient
  .inputSchema(esquemaEliminarValor)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ id: string }>> => {
    if (!puede(ctx.permisos, 'repuestos.configurar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_CATALOGOS)
    }
    const hecho = await repositorioDeValores.eliminar(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeRepuestos)
    return hecho
  })
