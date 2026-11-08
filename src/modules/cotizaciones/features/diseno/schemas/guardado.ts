import { z } from 'zod'
import { esquemaDiseno } from '../../../entities/diseno'
import { esquemaDefinicion, esquemaParams } from '../../../entities/formula'

// Lo que manda «Guardar el borrador» del diseño (4.22-2). La definición y los `params` van como se leyeron (planos, como los guarda la base): se aceptan si sus esquemas
// los aceptan, sin partirlos. De las esperadas, exactamente una: la publicada sobre la que se empezó (crear) o la hora del borrador leído (pisar), un ISO con zona tal
// cual lo da la base (con sus microsegundos).
const esquemaDeEsperada = z.discriminatedUnion('sobre', [
  z.strictObject({ sobre: z.literal('publicada'), publicadaId: z.guid() }),
  z.strictObject({ sobre: z.literal('borrador'), actualizadoEn: z.iso.datetime({ offset: true }) }),
])

export const esquemaDeGuardarDiseno = z.object({
  origenId: z.guid(),
  definicion: esquemaDefinicion,
  params: z.record(z.string(), z.unknown()).refine((p) => esquemaParams.safeParse(p).success, {
    error: 'Los valores no tienen su forma.',
  }),
  // Este editor no borra el diseño: nunca nulo.
  diseno: esquemaDiseno,
  nota: z.string().max(2000).nullable(),
  esperada: esquemaDeEsperada,
})

export type EntradaDeGuardarDiseno = z.infer<typeof esquemaDeGuardarDiseno>
