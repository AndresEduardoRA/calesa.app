// La fila de `vehiculos` que arma la unidad del panel (6.01). Se valida con Zod en el borde (ids con `z.guid()`): una fila que no cumple es un error visible,
// no una unidad a medias. Sólo cuatro columnas más el título; no se ensancha el tipo `Vehiculo` de otro módulo.
import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import type { Unidad } from './unidad'

/** Lo que se pide a PostgREST de `vehiculos` para armar la unidad. */
export const COLUMNAS_DE_UNIDAD = 'id, origen_id, titulo, fase_id, fase_desde'

const esquemaDeFila = z.object({
  id: z.guid(),
  origen_id: z.guid(),
  titulo: z.string(),
  fase_id: z.guid().nullable(),
  fase_desde: z.string().nullable(),
})

/** La unidad de vehículo de una fila de `vehiculos` (`null` si no hay fila), o el error si no se puede confiar en ella. */
export function unidadDeVehiculo(fila: unknown): Resultado<Unidad | null> {
  if (fila === null) return ok(null)
  const leida = esquemaDeFila.safeParse(fila)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const { id, origen_id, titulo, fase_id, fase_desde } = leida.data
  return ok({
    tipo: 'vehiculo',
    id,
    origenId: origen_id,
    titulo,
    faseId: fase_id,
    faseDesde: fase_desde,
  })
}
