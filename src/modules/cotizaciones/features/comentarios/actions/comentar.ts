'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeComentarios } from '../../../areas/comentarios/composicion'
import type { Comentario } from '../../../entities/comentarios/comentario'
import { esquemaComentar } from '../schemas/comentarios'

// Comenta una cotización o responde un comentario (4.27-2). La base pide ver la cotización y deja la respuesta a una respuesta colgando de su raíz. Sin
// `revalidatePath`: la sección lleva su propia lista y refrescar la página volvería a dibujar la hoja.
export const comentarCotizacion = actionClient
  .inputSchema(esquemaComentar)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<Comentario>> =>
    repositorioDeComentarios.comentar(parsedInput),
  )
