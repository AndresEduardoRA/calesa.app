import { z } from 'zod'
import { esquemaDelCuerpoDeLaNota } from '../../../entities/mover/notas'

// Lo que cruza el límite de escribir una nota: la forma y el largo. El `origenId` sólo sirve para decidir con `puede()` por comodidad (D7 de 6.04); la policy vuelve a decidir con el origen real.
// Una nota es de un vehículo o de un repuesto, uno y sólo uno (8.13-2): `vehiculo` xor `repuesto`. Sólo un vehículo exige su origen; un ítem no tiene (se decide con `repuestos.ver`, global).
export const esquemaCrearNota = z
  .object({
    vehiculo: z.guid().optional(),
    repuesto: z.guid().optional(),
    origenId: z.guid().optional(),
    cuerpo: esquemaDelCuerpoDeLaNota,
  })
  .superRefine((nota, ctx) => {
    if ((nota.vehiculo === undefined) === (nota.repuesto === undefined)) {
      ctx.addIssue({ code: 'custom', message: 'La nota es de un vehículo o de un repuesto.' })
    } else if (nota.vehiculo !== undefined && nota.origenId === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Falta el origen del vehículo.' })
    }
  })

export const esquemaEditarNota = z
  .object({
    id: z.guid(),
    // Nulo para un ítem: no tiene origen.
    origenId: z.guid().nullable(),
    tipo: z.enum(['vehiculo', 'repuesto']).default('vehiculo'),
    cuerpo: esquemaDelCuerpoDeLaNota,
  })
  .refine((nota) => nota.tipo === 'repuesto' || nota.origenId !== null, {
    error: 'Falta el origen del vehículo.',
    path: ['origenId'],
  })
