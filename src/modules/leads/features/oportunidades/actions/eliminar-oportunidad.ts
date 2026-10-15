'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeOportunidades } from '../../../composicion'
import type { ResultadoDeOportunidad } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaVersionDeOportunidad } from '../schemas/oportunidades'

// Elimina una oportunidad propia (lógico: vuelve con «Deshacer»).
export const eliminarOportunidad = actionClient
  .inputSchema(esquemaVersionDeOportunidad)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeOportunidad>> =>
    comoResultado(await repositorioDeOportunidades.eliminar(parsedInput)),
  )
