'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbudos } from '../../../composicion'
import type { ResultadoDeEmbudo } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaEliminarEmbudo } from '../schemas/embudos'

// Elimina un embudo propio sin oportunidades (nunca el de por defecto).
export const eliminarEmbudo = actionClient
  .inputSchema(esquemaEliminarEmbudo)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEmbudo>> =>
    comoResultado(await repositorioDeEmbudos.eliminar(parsedInput)),
  )
