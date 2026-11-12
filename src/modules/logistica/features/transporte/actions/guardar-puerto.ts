'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCatalogosDeTransporte } from '../../../areas/transporte/composicion'
import type { PuertoDeCatalogo } from '../../../entities/transporte/catalogo'
import { esquemaGuardarPuerto } from '../schemas/catalogo'

// Corrige un puerto con sólo lo que cambió, o lo activa o desactiva (6.08-1). Lo admite quien tiene `logistica.catalogos.gestionar`: lo exige la RLS de la tabla.
export const guardarPuerto = actionClient
  .inputSchema(esquemaGuardarPuerto)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<PuertoDeCatalogo>> => {
    return repositorioDeCatalogosDeTransporte.guardarPuerto(parsedInput)
  })
