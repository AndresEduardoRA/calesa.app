import { z } from 'zod'
import { esquemaDeNota } from '../../../entities/formula/publicacion'

// Lo que manda «Publicar» (4.20-2b): el origen, la nota (vacía no viaja: el navegador la frena antes) y la publicada que la pestaña leyó.
export const esquemaDePublicar = z.object({
  origenId: z.guid(),
  nota: esquemaDeNota,
  publicadaEsperada: z.guid().nullable(),
})

export type EntradaDePublicar = z.infer<typeof esquemaDePublicar>

// Lo que manda «Revertir»: la versión archivada y la publicada leída, que no puede faltar.
export const esquemaDeRevertir = z.object({
  origenId: z.guid(),
  versionId: z.guid(),
  nota: esquemaDeNota,
  publicadaEsperada: z.guid(),
})
