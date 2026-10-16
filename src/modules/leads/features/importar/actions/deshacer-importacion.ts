'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeImportacion } from '../../../composicion'
import type { ResultadoDeDeshacer } from '../../../entities/importacion/deshacer'
import { esquemaDeshacerImportacion } from '../schemas/importacion'

// Deshace una importación propia dentro de 24 h. No pide permisos: la base sólo deja a quien la hizo
// (aunque ya no tenga `leads.crear`), y lo ajeno o inexistente se dice igual que lo que no es suyo.
export const deshacerImportacionDeLeads = actionClient
  .inputSchema(esquemaDeshacerImportacion)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeDeshacer>> => {
    const resultado = await repositorioDeImportacion.deshacer(parsedInput.importacionId)
    if (resultado.ok) {
      // Lo que salió deja el listado, entra a la papelera, y la lista de recientes cambia.
      revalidatePath(RUTAS.leads)
      revalidatePath(RUTAS.papeleraDeLeads)
      revalidatePath(RUTAS.importarLeads)
    }
    return resultado
  })
