'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeComentarios } from '../../../areas/comentarios/composicion'
import type { ResultadoDeBorrar } from '../../../entities/comentarios/comentario'
import { esquemaBorrarComentario } from '../schemas/comentarios'

// Borra un comentario (4.27-2): quien lo escribió o quien modera, con la versión que estaba en pantalla. Devuelve qué hizo la base (`borrado`, `eliminado` o
// `sin_cambios`) para que la lista haga lo mismo.
export const borrarComentario = actionClient
  .inputSchema(esquemaBorrarComentario)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ resultado: ResultadoDeBorrar }>> => {
    const borrado = await repositorioDeComentarios.borrar(parsedInput)
    return borrado.ok ? { ok: true, data: { resultado: borrado.data } } : borrado
  })
