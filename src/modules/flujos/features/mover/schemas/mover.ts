import { z } from 'zod'
import { LARGO_MAXIMO_DE_LA_NOTA, TOPE_DEL_LOTE } from '../../../entities/mover/para-mover'
import { unidadDelPedido } from '../../../entities/mover/unidad-a-mover'

// Lo que cruza el límite de mover: la forma y los topes. Lo que vale cada cosa (acceso, rol, requisitos, nota obligatoria, conflicto) lo dice la base. El `origenId` sólo sirve para
// decidir con `puede()` por comodidad (D7 de 6.04): la base vuelve a decidir con el origen real de la unidad.
const nota = z
  .string()
  .trim()
  .max(LARGO_MAXIMO_DE_LA_NOTA)
  .optional()
  .transform((texto) => (texto ? texto : null))

// Una unidad es un vehículo o un repuesto, uno y sólo uno (8.13-1): `vehiculo` xor `repuesto`. Sale como `unidad` y `origenId` (nulo para un ítem). Sólo un vehículo exige su origen
// donde la acción decide con `puede()`; un ítem se mueve con `repuestos.mover`, global.
const forma = {
  vehiculo: z.guid().optional(),
  repuesto: z.guid().optional(),
  origenId: z.guid().optional(),
}

function conUnidad(exigirOrigen: boolean) {
  return <T extends { vehiculo?: string; repuesto?: string; origenId?: string }>(
    { vehiculo, repuesto, origenId, ...resto }: T,
    ctx: z.RefinementCtx,
  ) => {
    const leida = unidadDelPedido({ vehiculo, repuesto, origenId }, exigirOrigen)
    if (!leida.ok) {
      ctx.addIssue({ code: 'custom', message: leida.error.mensaje })
      return z.NEVER
    }
    return { ...resto, ...leida.data }
  }
}

const unidades = z
  .array(z.object({ vehiculo: z.guid(), faseEsperada: z.guid().nullable() }))
  .min(1)
  .max(TOPE_DEL_LOTE)
  .refine((lista) => new Set(lista.map((u) => u.vehiculo)).size === lista.length, {
    error: 'Un vehículo está dos veces en el lote.',
  })

export const esquemaLeerParaMover = z.object(forma).transform(conUnidad(true))

export const esquemaPrevisualizarCambio = z
  .object({ ...forma, faseDestino: z.guid() })
  .transform(conUnidad(false))

export const esquemaPrevisualizarCambioLote = z.object({
  fase: z.guid(),
  vehiculos: z.array(z.guid()).min(1).max(TOPE_DEL_LOTE),
})

export const esquemaCambiarFase = z
  .object({
    ...forma,
    faseDestino: z.guid(),
    // La fase en la que se veía la unidad: otra distinta es un conflicto. Nula sólo si no tenía fase.
    faseEsperada: z.guid().nullable(),
    nota,
  })
  .transform(conUnidad(true))

export const esquemaCambiarFaseLote = z.object({
  origenId: z.guid(),
  faseDestino: z.guid(),
  nota,
  unidades,
})

export const esquemaDestinosDeLaFase = z.object({ origenId: z.guid(), faseId: z.guid() })
