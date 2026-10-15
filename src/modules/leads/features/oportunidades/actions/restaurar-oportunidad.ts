'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeOportunidades } from '../../../composicion'
import type { ResultadoDeOportunidad } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaVersionDeOportunidad } from '../schemas/oportunidades'

// «Deshacer» de eliminar: con la versión que devolvió el borrado.
export const restaurarOportunidad = actionClient
  .inputSchema(esquemaVersionDeOportunidad)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeOportunidad>> =>
    comoResultado(await repositorioDeOportunidades.restaurar(parsedInput)),
  )
