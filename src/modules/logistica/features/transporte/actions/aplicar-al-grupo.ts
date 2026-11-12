'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTransporte } from '../../../areas/transporte/composicion'
import type { GrupoAplicado } from '../../../entities/transporte/repositorio-de-transporte'
import { esquemaAplicarAlGrupo } from '../schemas/grupo'

// Aplica lo mismo a todas las unidades de un embarque o contenedor, con las versiones que vio el resumen (6.08-4). Todo o nada: la base pide `logistica.transporte.editar` por unidad.
export const aplicarAlGrupo = actionClient
  .inputSchema(esquemaAplicarAlGrupo)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<GrupoAplicado>> => {
    return repositorioDeTransporte.aplicarAlGrupo(parsedInput)
  })
