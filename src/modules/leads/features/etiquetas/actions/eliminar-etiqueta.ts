'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEtiquetas } from '../../../composicion'
import type { ResultadoDeEtiqueta } from '../../../entities/repositorios'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaEliminarEtiqueta } from '../schemas/etiquetas'

// Elimina una etiqueta propia (y la quita de los leads donde estaba). Una que ya no está responde
// «sin cambios»: la otra pestaña ya la borró.
export const eliminarEtiqueta = actionClient
  .inputSchema(esquemaEliminarEtiqueta)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEtiqueta>> =>
    comoResultado(await repositorioDeEtiquetas.eliminar(parsedInput)),
  )
