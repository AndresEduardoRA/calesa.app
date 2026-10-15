'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEtiquetas } from '../../../composicion'
import type { ResultadoDeEtiqueta } from '../../../entities/repositorios'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaCrearEtiqueta } from '../schemas/etiquetas'

// Crea una etiqueta propia. Sin color, la base elige el menos usado. Idempotente por id.
export const crearEtiqueta = actionClient
  .inputSchema(esquemaCrearEtiqueta)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEtiqueta>> =>
    comoResultado(await repositorioDeEtiquetas.crear(parsedInput)),
  )
