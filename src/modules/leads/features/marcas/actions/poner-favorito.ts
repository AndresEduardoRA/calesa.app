'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMarcas } from '../../../composicion'
import type { ResultadoDeMarca } from '../../../entities/marcas'
import { esquemaPonerMarca } from '../schemas/marcas'
import { comoResultado } from './resultado'

// Marca o desmarca un lead como favorito de quien mira. Basta con verlo (es una nota para uno
// mismo, no un cambio del lead): no pide `leads.editar` ni la cartera.
export const ponerFavorito = actionClient
  .inputSchema(esquemaPonerMarca)
  .action(
    async ({
      parsedInput,
    }): Promise<ResultadoDeAccion<{ resultado: ResultadoDeMarca; valor: boolean }>> =>
      comoResultado(await repositorioDeMarcas.favorito(parsedInput)),
  )
