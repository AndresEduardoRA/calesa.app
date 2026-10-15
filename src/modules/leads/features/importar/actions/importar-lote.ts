'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeImportacion } from '../../../composicion'
import type { ResultadoDeFila } from '../../../entities/importacion/lotes'
import { esquemaImportarLote } from '../schemas/importacion'

// Un lote de la importación (hasta 50 filas). Cada fila se crea con las reglas del alta o se explica;
// una mala no tumba a las demás. Es idempotente por el id de cada fila: reenviarlo tras perder la
// respuesta no duplica. El permiso se comprueba acá y de nuevo en la base (`leads.crear`).
export const importarLoteDeLeads = actionClient
  .inputSchema(esquemaImportarLote)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeFila[]>> => {
    if (!puede(ctx.permisos, 'leads.crear')) {
      return fallo('sin_permiso', 'No tienes permiso para importar leads.')
    }
    const resultado = await repositorioDeImportacion.importarLote(parsedInput)
    if (resultado.ok) {
      // Los leads nuevos están en la primera página del listado.
      revalidatePath(RUTAS.leads)
    }
    return resultado
  })
