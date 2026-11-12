'use server'

import type { Resultado } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeStock } from '../../../areas/stock/composicion'
import type { PaginaDeMovimientos } from '../../../entities/stock/movimientos'
import { esquemaLeerMovimientos } from '../schemas/stock'

// El historial de stock de un ítem al abrir su panel y con «Ver más» (8.10-2, C8). La RLS (`repuestos.ver`) decide qué se ve: un ítem que no se ve vuelve sin movimientos.
export const leerMovimientosDeItem = actionClient
  .inputSchema(esquemaLeerMovimientos)
  .action(async ({ parsedInput }): Promise<Resultado<PaginaDeMovimientos>> => {
    return repositorioDeStock.movimientos(parsedInput)
  })
