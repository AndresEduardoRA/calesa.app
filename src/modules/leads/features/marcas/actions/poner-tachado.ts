'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMarcas } from '../../../composicion'
import type { ResultadoDeMarca } from '../../../entities/marcas'
import { esquemaPonerMarca } from '../schemas/marcas'
import { comoResultado } from './resultado'

// Tacha o destacha un lead para quien mira (el listado lo oculta por defecto). Basta con verlo.
export const ponerTachado = actionClient
  .inputSchema(esquemaPonerMarca)
  .action(
    async ({
      parsedInput,
    }): Promise<ResultadoDeAccion<{ resultado: ResultadoDeMarca; valor: boolean }>> =>
      comoResultado(await repositorioDeMarcas.tachado(parsedInput)),
  )
