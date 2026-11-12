'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeImagenes } from '../../../areas/items/composicion'
import type { ImagenDeItem } from '../../../entities/items/imagenes'
import { esquemaLeerImagenes } from '../schemas/imagenes'

// Las imágenes de un ítem al abrir su panel (8.09-3, C5, D64). La RLS (`repuestos.ver`) decide qué se ve: un ítem que no existe o que no se ve vuelve como lista vacía.
export const leerImagenesDeItem = actionClient
  .inputSchema(esquemaLeerImagenes)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ImagenDeItem[]>> => {
    return repositorioDeImagenes.listar(parsedInput.itemId)
  })
