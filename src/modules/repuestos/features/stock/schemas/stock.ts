import { z } from 'zod'
import { MOTIVOS_CON_BOTON } from '../../../entities/stock/motivos'
import {
  MAXIMO_DE_NOTA_DE_STOCK,
  MENSAJE_DE_CANTIDAD_DE_STOCK,
  MENSAJE_DE_NOTA_LARGA,
} from '../../../entities/stock/reglas'

// Lo que cruza al servidor al mover el stock de un ítem (8.10-2, C7). `sobrante` entra (la hoja) y `vendido`/`devuelto` salen (la vista «Stock», 8.10-3); `ajuste` no tiene
// botón y `reasignado` tiene su RPC (D2). La base vuelve a validarlo todo bajo su candado.
const ENTERO_MAXIMO = 2147483647

const unidades = z
  .int({ error: MENSAJE_DE_CANTIDAD_DE_STOCK })
  .min(1, { error: MENSAJE_DE_CANTIDAD_DE_STOCK })
  .max(ENTERO_MAXIMO, { error: MENSAJE_DE_CANTIDAD_DE_STOCK })

export const esquemaMoverStock = z.object({
  itemId: z.guid(),
  motivo: z.enum(['sobrante', ...MOTIVOS_CON_BOTON]),
  unidades,
  stockEsperado: z.int().min(0).max(ENTERO_MAXIMO),
  nota: z
    .string()
    .trim()
    .max(MAXIMO_DE_NOTA_DE_STOCK, { error: MENSAJE_DE_NOTA_LARGA })
    .nullable()
    .transform((nota) => (nota === null || nota === '' ? null : nota)),
})

export type EntradaDeMoverStock = z.input<typeof esquemaMoverStock>

// Reasignar unidades del stock a otro proyecto (8.10-3, C3). El `id` del ítem nuevo lo crea el navegador al abrir el formulario: la RPC es idempotente por él.
export const esquemaReasignarStock = z.object({
  itemId: z.guid(),
  proyectoDestinoId: z.guid({ error: 'Elige el proyecto destino.' }),
  unidades,
  id: z.guid(),
})

export type EntradaDeReasignarStock = z.input<typeof esquemaReasignarStock>

// El historial de un ítem: sin cursor, la primera página; con él, los anteriores a ese id.
export const esquemaLeerMovimientos = z.object({
  itemId: z.guid(),
  cursor: z.int().positive().nullable(),
})
