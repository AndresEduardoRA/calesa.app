'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeOportunidades } from '../../../composicion'
import type { ResultadoDeOportunidad } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaCrearOportunidad } from '../schemas/oportunidades'

// Crea una oportunidad sobre un lead de la cartera (idempotente por el id del intento).
export const crearOportunidad = actionClient
  .inputSchema(esquemaCrearOportunidad)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeOportunidad>> =>
    comoResultado(await repositorioDeOportunidades.crear(parsedInput)),
  )
