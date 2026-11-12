'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeImagenes } from '../../../areas/items/composicion'
import { SIN_PERMISO_PARA_EDITAR_IMAGENES } from '../../../entities/items/imagenes'
import type { ResultadoDeAgregar } from '../../../entities/items/imagenes-repositorio'
import { esquemaAgregarImagenes } from '../schemas/imagenes'

// Registra las imágenes que el navegador ya subió (8.09-3, C6). El permiso se mira antes de escribir; la base impone el tope de 8 bajo candado, la carpeta del ítem, que el objeto exista y que el
// proyecto esté abierto (23514 con su mensaje), y el repositorio saca lo repetido y cuenta lo que no cupo. Devuelve la lista completa después, para dibujarla.
export const agregarImagenes = actionClient
  .inputSchema(esquemaAgregarImagenes)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeAgregar>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_EDITAR_IMAGENES)
    }
    return repositorioDeImagenes.agregar(parsedInput)
  })
