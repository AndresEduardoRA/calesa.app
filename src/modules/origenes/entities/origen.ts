// Un origen de vehículos, con lo mínimo para nombrarlo y elegirlo desde otra pantalla (la matriz
// de roles acota permisos por origen). El layout de campos y las categorías llegan en la fase 2.
import { z } from 'zod'

export type OrigenResumen = {
  id: string
  // Sale de la fila: ningún texto fijo de la interfaz nombra un origen.
  nombre: string
  color: string
}

const esquemaOrigenes = z.array(
  // guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
  z.object({ id: z.guid(), nombre: z.string(), color: z.string() }),
)

export function origenesDesde(filas: unknown): OrigenResumen[] {
  return esquemaOrigenes.parse(filas)
}
