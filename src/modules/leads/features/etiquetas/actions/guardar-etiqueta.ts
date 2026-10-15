'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEtiquetas } from '../../../composicion'
import type { ResultadoDeEtiqueta } from '../../../entities/repositorios'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaGuardarEtiqueta } from '../schemas/etiquetas'

// Renombra o recolorea una etiqueta propia, con la versión que se tenía en pantalla.
export const guardarEtiqueta = actionClient
  .inputSchema(esquemaGuardarEtiqueta)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEtiqueta>> =>
    comoResultado(await repositorioDeEtiquetas.guardar(parsedInput)),
  )
