'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCategorias } from '../../../areas/dinero/composicion'
import type { CategoriaDeGasto } from '../../../entities/dinero/categoria'
import { esquemaGuardarCategoria } from '../schemas/categoria'

// Corrige una categoría de gasto con sólo lo que cambió, o la activa o desactiva (6.11-4).
export const guardarCategoria = actionClient
  .inputSchema(esquemaGuardarCategoria)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<CategoriaDeGasto>> => {
    return repositorioDeCategorias.guardar(parsedInput)
  })
