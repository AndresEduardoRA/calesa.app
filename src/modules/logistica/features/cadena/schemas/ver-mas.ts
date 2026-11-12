import { z } from 'zod'

// Lo que cruza al servidor en «Ver más» de una columna (6.03-1). La base vuelve a revisarlo todo (acceso, fase, cursor); aquí se corta lo que no tiene la forma. `faseId` nulo es
// «Sin fase» y su cursor no lleva fecha. Los filtros son los de la URL ya reducidos a lo que la RPC acepta (`strictObject`: otra clave es un 22023).
const texto = z.string().trim().min(1).max(100)

export const esquemaDeFiltrosDeVerMas = z.strictObject({
  q: texto.optional(),
  demoradas: z.literal(true).optional(),
  por_aprobar: z.literal(true).optional(),
  contenedor: texto.optional(),
  booking: texto.optional(),
  naviera: z.guid().optional(),
})

export const esquemaDeVerMas = z.object({
  origenId: z.guid(),
  faseId: z.guid().nullable(),
  cursor: z.object({ desde: z.iso.datetime({ offset: true }).nullable(), id: z.guid() }),
  filtros: esquemaDeFiltrosDeVerMas,
})

export type EntradaDeVerMas = z.infer<typeof esquemaDeVerMas>
