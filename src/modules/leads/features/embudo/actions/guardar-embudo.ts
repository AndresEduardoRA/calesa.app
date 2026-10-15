'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbudos } from '../../../composicion'
import type { ResultadoDeEmbudo } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaGuardarEmbudo } from '../schemas/embudos'

// Renombra un embudo propio, con la versión que se tenía en pantalla.
export const guardarEmbudo = actionClient
  .inputSchema(esquemaGuardarEmbudo)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEmbudo>> =>
    comoResultado(await repositorioDeEmbudos.guardar(parsedInput)),
  )
