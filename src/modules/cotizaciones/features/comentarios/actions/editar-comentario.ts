'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeComentarios } from '../../../areas/comentarios/composicion'
import type { Comentario } from '../../../entities/comentarios/comentario'
import { esquemaEditarComentario } from '../schemas/comentarios'

// Edita el texto de un comentario propio con la versión que estaba en pantalla (4.27-2). Otra versión es un conflicto (PT409) con su mensaje.
export const editarComentario = actionClient
  .inputSchema(esquemaEditarComentario)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<Comentario>> =>
    repositorioDeComentarios.editar(parsedInput),
  )
