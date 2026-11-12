import { z } from 'zod'
import { LARGO_MAXIMO_DE_LA_NOTA, TOPE_DEL_LOTE } from '../../../entities/mover/para-mover'

// Lo que cruza el límite de mover: la forma y los topes. Lo que vale cada cosa (acceso, rol, requisitos, nota obligatoria, conflicto) lo dice la base. El `origenId` sólo sirve para
// decidir con `puede()` por comodidad (D7 de 6.04): la base vuelve a decidir con el origen real de la unidad.
const nota = z
  .string()
  .trim()
  .max(LARGO_MAXIMO_DE_LA_NOTA)
  .optional()
  .transform((texto) => (texto ? texto : null))

const unidades = z
  .array(z.object({ vehiculo: z.guid(), faseEsperada: z.guid().nullable() }))
  .min(1)
  .max(TOPE_DEL_LOTE)
  .refine((lista) => new Set(lista.map((u) => u.vehiculo)).size === lista.length, {
    error: 'Un vehículo está dos veces en el lote.',
  })

export const esquemaLeerParaMover = z.object({ vehiculo: z.guid(), origenId: z.guid() })

export const esquemaPrevisualizarCambio = z.object({ vehiculo: z.guid(), faseDestino: z.guid() })

export const esquemaPrevisualizarCambioLote = z.object({
  fase: z.guid(),
  vehiculos: z.array(z.guid()).min(1).max(TOPE_DEL_LOTE),
})

export const esquemaCambiarFase = z.object({
  vehiculo: z.guid(),
  origenId: z.guid(),
  faseDestino: z.guid(),
  // La fase en la que se veía la unidad: otra distinta es un conflicto. Nula sólo si no tenía fase.
  faseEsperada: z.guid().nullable(),
  nota,
})

export const esquemaCambiarFaseLote = z.object({
  origenId: z.guid(),
  faseDestino: z.guid(),
  nota,
  unidades,
})

export const esquemaDestinosDeLaFase = z.object({ origenId: z.guid(), faseId: z.guid() })
