import { z } from 'zod'

// Lo que cruza al servidor al crear una cotización de repuestos (8.12-3, C7). El id lo genera el cliente una vez por intento (D32). La base vuelve a
// revisarlo todo (la moneda activa, el proyecto vivo y abierto, la configuración).
export const esquemaCrearCotizacion = z.strictObject({
  id: z.guid(),
  proyectoId: z.guid(),
  moneda: z.string().regex(/^[A-Z]{3}$/),
})

export type EntradaCrearCotizacion = z.infer<typeof esquemaCrearCotizacion>
