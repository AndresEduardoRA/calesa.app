import { z } from 'zod'

// Lo que cruza al servidor en «Ver más» de una columna de la Cadena de repuestos (8.13-3). La base vuelve a revisarlo todo (RLS); aquí se corta lo que no tiene la forma. `faseId` nulo es «Sin fase»
// y su cursor no lleva fecha. Los filtros son los de la URL ya reducidos (`pedidoDeLaCadena`).
export const esquemaDeVerMasDeRepuestos = z.object({
  faseId: z.guid().nullable(),
  orden: z.enum(['antiguos', 'recientes']),
  cursor: z.object({ desde: z.iso.datetime({ offset: true }).nullable(), id: z.guid() }),
  filtros: z.strictObject({
    q: z.string().trim().min(1).max(100).nullable(),
    proyecto: z.guid().nullable(),
  }),
})

export const esquemaDeLeerEsperas = z.object({ vehiculo: z.guid() })
