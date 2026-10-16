'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeImportacion } from '../../../composicion'
import { esquemaTerminarImportacion } from '../schemas/importacion'

// Cierra la importación: deja la constancia (sólo cuántas entraron, cuántas ya existían y cuántas se
// rechazaron: nunca los datos) y recuerda el origen del archivo para la próxima vez.
export const terminarImportacionDeLeads = actionClient
  .inputSchema(esquemaTerminarImportacion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ creadas: number }>> => {
    if (!puede(ctx.permisos, 'leads.crear')) {
      return fallo('sin_permiso', 'No tienes permiso para importar leads.')
    }
    const resultado = await repositorioDeImportacion.terminar(parsedInput)
    if (resultado.ok) {
      revalidatePath(RUTAS.leads)
      // Aparece en «Tus importaciones recientes».
      revalidatePath(RUTAS.importarLeads)
    }
    return resultado
  })
