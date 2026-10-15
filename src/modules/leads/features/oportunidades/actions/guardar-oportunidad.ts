'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeOportunidades } from '../../../composicion'
import type { ResultadoDeOportunidad } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaGuardarOportunidad } from '../schemas/oportunidades'

// Edita una oportunidad propia, con la versión que se tenía en pantalla.
export const guardarOportunidad = actionClient
  .inputSchema(esquemaGuardarOportunidad)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeOportunidad>> =>
    comoResultado(await repositorioDeOportunidades.guardar(parsedInput)),
  )
