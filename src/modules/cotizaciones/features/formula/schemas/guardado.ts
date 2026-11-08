import { z } from 'zod'
import { esquemaDiseno } from '../../../entities/diseno'
import { esquemaDefinicion, esquemaParams } from '../../../entities/formula'

// Lo que manda «Guardar el borrador» (4.21-3b-1). Los `params` van planos, como los guarda la base: se aceptan si `esquemaParams` los acepta, sin partirlos.
// De las esperadas, exactamente una (cada rama es estricta): la publicada sobre la que se empezó (crear) o la hora del borrador leído (pisar), un ISO con zona tal
// cual lo da la base (con sus microsegundos).
const esquemaDeEsperada = z.discriminatedUnion('sobre', [
  z.strictObject({ sobre: z.literal('publicada'), publicadaId: z.guid() }),
  z.strictObject({ sobre: z.literal('borrador'), actualizadoEn: z.iso.datetime({ offset: true }) }),
])

export const esquemaDeGuardarBorrador = z.object({
  origenId: z.guid(),
  definicion: esquemaDefinicion,
  params: z
    .record(z.string(), z.unknown())
    .refine((p) => esquemaParams.safeParse(p).success, {
      error: 'Los valores no tienen su forma.',
    }),
  diseno: esquemaDiseno.nullable(),
  nota: z.string().max(2000).nullable(),
  esperada: esquemaDeEsperada,
})

export type EntradaDeGuardarBorrador = z.infer<typeof esquemaDeGuardarBorrador>
