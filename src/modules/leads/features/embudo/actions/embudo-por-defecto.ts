'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbudos } from '../../../composicion'
import type { ResultadoDeEmbudo } from '../../../entities/repositorios-de-oportunidades'
import { comoResultado } from '../../marcas/actions/resultado'

// Devuelve el embudo por defecto de quien mira, y lo crea la primera vez (idempotente).
export const embudoPorDefecto = actionClient.action(
  async (): Promise<ResultadoDeAccion<ResultadoDeEmbudo>> =>
    comoResultado(await repositorioDeEmbudos.porDefecto()),
)
