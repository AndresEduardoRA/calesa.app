import { z } from 'zod'

// Lo que manda la hoja al guardar (`PedidoDeGuardado`). Los ids son de la base (`z.guid()`); la hoja abierta es opaca y acotada (`<fórmula>.<µs>.<firma>`); las entradas
// tienen la forma que acepta `cotizacion_crear()` y la base las valida otra vez contra la fórmula.
const entradas = z.object({
  inputs: z.record(z.string().max(200), z.number()),
  banderas: z.record(z.string().max(200), z.boolean()),
  overrides: z.record(z.string().max(200), z.number()),
  variante: z.string().max(200).optional(),
})

export const esquemaDeGuardado = z.object({
  intento: z.guid(),
  origenId: z.guid(),
  leadId: z.guid(),
  vehiculoId: z.guid().nullable(),
  abierta: z.string().min(1).max(300),
  entradas,
  modoTc: z.string().min(1).max(200).nullable(),
  verTotalBs: z.boolean(),
  conLaAbierta: z.boolean(),
})
