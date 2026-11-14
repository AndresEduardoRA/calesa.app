'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAprobada } from '../../../areas/aprobada/composicion'
import { puedeAprobarAlguna } from '../../../entities/aprobada/acceso'
import type { ResultadoDeAprobar } from '../../../entities/aprobada/tipos'
import { esquemaAprobar } from '../schemas/aprobar'

// Aprueba una cotización. Sin aprobar en algún origen no se llama a la base; el origen, el vehículo, el estado y la versión los mira la base, que devuelve el motivo para
// la persona. **No revalida ni refresca**: se llama desde la guardada, con lo tipeado en la hoja (`.claude/rules/acciones.md`); la isla aplica lo devuelto.
export const aprobarCotizacion = actionClient
  .inputSchema(esquemaAprobar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeAprobar>> => {
    if (!puedeAprobarAlguna(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para aprobar cotizaciones.')
    }
    return repositorioDeAprobada.aprobar(parsedInput.id, parsedInput.actualizadoEn)
  })
