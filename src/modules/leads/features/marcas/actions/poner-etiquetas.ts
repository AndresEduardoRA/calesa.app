'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMarcas } from '../../../composicion'
import type { ResultadoDeMarca } from '../../../entities/marcas'
import { esquemaPonerEtiquetas } from '../schemas/marcas'
import { comoResultado } from './resultado'

// Pone o quita esas etiquetas propias en un lead que quien mira ve. Devuelve cómo quedaron las suyas.
export const ponerEtiquetas = actionClient
  .inputSchema(esquemaPonerEtiquetas)
  .action(
    async ({
      parsedInput,
    }): Promise<ResultadoDeAccion<{ resultado: ResultadoDeMarca; etiquetas: string[] }>> =>
      comoResultado(await repositorioDeMarcas.etiquetas(parsedInput)),
  )
