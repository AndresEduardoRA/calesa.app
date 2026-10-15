'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbudos } from '../../../composicion'
import type { ResultadoDeEmbudo } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaGuardarEtapas } from '../schemas/embudos'

// Guarda las etapas de un embudo propio, el conjunto entero de una vez.
export const guardarEtapas = actionClient
  .inputSchema(esquemaGuardarEtapas)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEmbudo>> =>
    comoResultado(await repositorioDeEmbudos.guardarEtapas(parsedInput)),
  )
