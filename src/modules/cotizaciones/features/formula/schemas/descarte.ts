import { z } from 'zod'

// Lo que manda «Descartar borrador» (4.20-2c): el origen y la hora del borrador que se leyó (4.21-3b-1), un ISO con zona tal cual lo da la base.
export const esquemaDeDescartar = z.object({
  origenId: z.guid(),
  actualizadoEsperado: z.iso.datetime({ offset: true }),
})

export type EntradaDeDescartar = z.infer<typeof esquemaDeDescartar>
