'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeItems } from '../../../areas/items/composicion'
import { cambioDeCelda } from '../../../entities/items/celda'
import { SIN_PERMISO_PARA_EDITAR_ITEMS } from '../../../entities/items/errores'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { esquemaGuardarCelda } from '../schemas/celda'

// Guarda una celda de la hoja (8.09-2, C9): el permiso se mira antes de escribir, el valor se valida con las reglas de la base y el repositorio versiona con `actualizado_en`. Devuelve la fila
// entera para que la hoja la reemplace (con la versión nueva). No revalida rutas: la hoja ya tiene la fila; la próxima visita lee de la base.
export const guardarCelda = actionClient
  .inputSchema(esquemaGuardarCelda)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FilaDeItem>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_EDITAR_ITEMS)
    }
    const cambio = cambioDeCelda(parsedInput.columna, parsedInput.valor, parsedInput.moneda)
    if (!cambio.ok) {
      return {
        ok: false,
        error: { codigo: 'validacion', mensaje: cambio.error },
        porCampo: { [parsedInput.columna]: cambio.error },
      }
    }
    return repositorioDeItems.guardar({
      id: parsedInput.id,
      fila: cambio.fila,
      actualizadoEn: parsedInput.actualizadoEn,
    })
  })
