'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeImagenes } from '../../../areas/items/composicion'
import { SIN_PERMISO_PARA_EDITAR_IMAGENES } from '../../../entities/items/imagenes'
import { esquemaQuitarImagen } from '../schemas/imagenes'

// Quita una imagen de un ítem (8.09-3, C7). Reversible: devuelve la ruta para el «Deshacer», que la vuelve a registrar mientras corre la gracia de la limpieza. No se borra ningún objeto desde la
// app: borrar la fila lo encola la base. Ya borrada es éxito (`ruta: null`).
export const quitarImagen = actionClient
  .inputSchema(esquemaQuitarImagen)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<ResultadoDeAccion<{ id: string; ruta: string | null }>> => {
      if (!puede(ctx.permisos, 'repuestos.editar')) {
        return fallo('sin_permiso', SIN_PERMISO_PARA_EDITAR_IMAGENES)
      }
      return repositorioDeImagenes.quitar(parsedInput.imagenId)
    },
  )
