import { z } from 'zod'
import { MAXIMO_DE_LINEAS } from '../../../entities/apibara'

const vin = z
  .string()
  .regex(/^[A-HJ-NPR-Z0-9]{11,17}$/)
  .optional()

// Lo que identifica a cada vehículo que se va a dar de alta: por VIN en cualquier origen y por
// lote (con su plataforma) en éste.
export const esquemaBuscarRepetidos = z.object({
  origenId: z.guid(),
  claves: z
    .array(
      z.object({
        vin,
        lote: z.string().min(1).max(40).optional(),
        plataforma: z.string().min(1).max(40).optional(),
      }),
    )
    .min(1)
    .max(MAXIMO_DE_LINEAS),
})
