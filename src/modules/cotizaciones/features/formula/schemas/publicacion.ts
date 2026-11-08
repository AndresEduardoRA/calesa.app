import { z } from 'zod'
import { esquemaDeNota } from '../../../entities/formula/publicacion'

// Lo que manda «Publicar» (4.20-2b): el origen, la nota (vacía no viaja: el navegador la frena antes), la publicada que la pestaña leyó y la hora del borrador
// (4.21-3b-1), un ISO con zona tal cual lo da la base.
export const esquemaDePublicar = z.object({
  origenId: z.guid(),
  nota: esquemaDeNota,
  publicadaEsperada: z.guid().nullable(),
  actualizadoEsperado: z.iso.datetime({ offset: true }),
})

export type EntradaDePublicar = z.infer<typeof esquemaDePublicar>

// Lo que manda «Revertir»: la versión archivada y la publicada leída, que no puede faltar.
export const esquemaDeRevertir = z.object({
  origenId: z.guid(),
  versionId: z.guid(),
  nota: esquemaDeNota,
  publicadaEsperada: z.guid(),
})
