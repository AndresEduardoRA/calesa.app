'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCategorias } from '../../../areas/dinero/composicion'
import type { CategoriaDeGasto } from '../../../entities/dinero/categoria'
import { esquemaCrearCategoria } from '../schemas/categoria'

// Crea una categoría de gasto (6.11-4). Lo admite quien tiene `logistica.catalogos.gestionar`: lo exige la RLS de la tabla.
export const crearCategoria = actionClient
  .inputSchema(esquemaCrearCategoria)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<CategoriaDeGasto>> => {
    return repositorioDeCategorias.crear(parsedInput)
  })
