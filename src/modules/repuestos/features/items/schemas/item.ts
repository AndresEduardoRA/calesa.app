import { z } from 'zod'

// Lo que cruza al servidor al agregar un ítem desde la fila nueva de la hoja (8.09-2, C10) y al eliminarlo (C11). `id` lo genera la fila al abrirse (idempotencia). Las reglas de la
// cantidad, el precio y la moneda son de `cambioDeCelda`; la base vuelve a revisarlas.
export const esquemaCrearItem = z.object({
  id: z.guid(),
  proyectoId: z.guid(),
  descripcion: z.string().max(5000),
  cantidad: z.number().optional(),
  precioCliente: z.number().optional(),
  moneda: z.string().length(3).optional(),
})

export const esquemaEliminarItem = z.object({
  id: z.guid(),
  actualizadoEn: z.string().min(1).max(64),
})
