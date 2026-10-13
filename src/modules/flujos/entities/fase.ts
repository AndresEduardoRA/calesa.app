// Una fase del flujo de un origen, con lo mínimo para nombrarla y elegirla desde otra pantalla
// (el inventario la muestra y filtra por ella). El nombre y el color salen de la fila.
import { z } from 'zod'

export type FaseResumen = {
  id: string
  nombre: string
  color: string
  orden: number
  esInicial: boolean
  esFinal: boolean
  // false = jubilada: sigue nombrando a lo que quedó ahí, pero ya no es destino.
  activa: boolean
}

// Las columnas que pide `fasesDesde()`.
export const COLUMNAS_DE_FASE = 'id, nombre, color, orden, es_inicial, es_final, activa'

const esquemaFases = z.array(
  z.object({
    id: z.guid(),
    nombre: z.string(),
    color: z.string(),
    orden: z.number(),
    es_inicial: z.boolean(),
    es_final: z.boolean(),
    activa: z.boolean(),
  }),
)

// En el orden del flujo: `orden`, y a igualdad el nombre.
export function fasesDesde(filas: unknown): FaseResumen[] {
  return esquemaFases
    .parse(filas)
    .map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      color: fila.color,
      orden: fila.orden,
      esInicial: fila.es_inicial,
      esFinal: fila.es_final,
      activa: fila.activa,
    }))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
}
