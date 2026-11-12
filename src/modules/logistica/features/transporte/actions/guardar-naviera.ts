'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCatalogosDeTransporte } from '../../../areas/transporte/composicion'
import type { NavieraDeCatalogo } from '../../../entities/transporte/catalogo'
import { esquemaGuardarNaviera } from '../schemas/catalogo'

// Corrige una naviera con sólo lo que cambió, o la activa o desactiva (6.08-1). Lo admite quien tiene `logistica.catalogos.gestionar`: lo exige la RLS de la tabla.
export const guardarNaviera = actionClient
  .inputSchema(esquemaGuardarNaviera)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<NavieraDeCatalogo>> => {
    return repositorioDeCatalogosDeTransporte.guardarNaviera(parsedInput)
  })
