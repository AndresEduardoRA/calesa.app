'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbudos } from '../../../composicion'
import type { ResultadoDeEmbudo } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaCrearEmbudo } from '../schemas/embudos'

// Crea un embudo propio (idempotente por el id del intento).
export const crearEmbudo = actionClient
  .inputSchema(esquemaCrearEmbudo)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEmbudo>> =>
    comoResultado(await repositorioDeEmbudos.crear(parsedInput)),
  )
