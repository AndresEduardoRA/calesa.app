'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeItems } from '../../../areas/items/composicion'
import { SIN_PERMISO_PARA_EDITAR_ITEMS } from '../../../entities/items/errores'
import { validarItemNuevo } from '../../../entities/items/nuevo'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { esquemaCrearItem } from '../schemas/item'

// Agrega un ítem (8.09-2, C10): el permiso se mira antes de escribir; lo tecleado en la fila nueva se valida con las reglas de la hoja y lo que protege es la base (`repuesto_item_crear`).
// Idempotente por `id`: un reintento tras un corte devuelve el mismo ítem. Devuelve la fila entera para dibujarla.
export const crearItem = actionClient
  .inputSchema(esquemaCrearItem)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FilaDeItem>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_EDITAR_ITEMS)
    }
    const nuevo = validarItemNuevo({
      descripcion: parsedInput.descripcion,
      cantidad: parsedInput.cantidad,
      precioCliente: parsedInput.precioCliente,
      moneda: parsedInput.moneda,
    })
    if (!nuevo.ok) {
      return {
        ok: false,
        error: { codigo: 'validacion', mensaje: nuevo.error },
        porCampo: { [nuevo.columna]: nuevo.error },
      }
    }
    return repositorioDeItems.crear({
      id: parsedInput.id,
      proyectoId: parsedInput.proyectoId,
      datos: nuevo.datos,
    })
  })
