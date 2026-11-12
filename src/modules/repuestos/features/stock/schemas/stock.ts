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

export const esquemaMoverStock = z.object({
  itemId: z.guid(),
  motivo: z.enum(['sobrante', ...MOTIVOS_CON_BOTON]),
  unidades: z
    .int({ error: MENSAJE_DE_CANTIDAD_DE_STOCK })
    .min(1, { error: MENSAJE_DE_CANTIDAD_DE_STOCK })
    .max(ENTERO_MAXIMO, { error: MENSAJE_DE_CANTIDAD_DE_STOCK }),
  stockEsperado: z.int().min(0).max(ENTERO_MAXIMO),
  nota: z
    .string()
    .trim()
    .max(MAXIMO_DE_NOTA_DE_STOCK, { error: MENSAJE_DE_NOTA_LARGA })
    .nullable()
    .transform((nota) => (nota === null || nota === '' ? null : nota)),
})

export type EntradaDeMoverStock = z.input<typeof esquemaMoverStock>
