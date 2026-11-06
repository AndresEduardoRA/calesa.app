import { z } from 'zod'

// Lo que manda «Descartar borrador» (4.20-2c): sólo el origen (la base borra el borrador que haya; la versión esperada llega en el 4.21).
export const esquemaDeDescartar = z.object({
  origenId: z.guid(),
})

export type EntradaDeDescartar = z.infer<typeof esquemaDeDescartar>
