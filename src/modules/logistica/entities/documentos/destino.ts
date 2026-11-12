import type { Unidad } from '../nucleo/unidad'

// A dónde va lo que se sube (6.06-3): una unidad (el hueco de su panel) o todas las de un grupo (el hueco del resumen del grupo). El objeto se guarda una sola vez, en la carpeta de la
// primera unidad, y `documento_registrar` crea una fila por unidad con ese mismo objeto. Pura: sin I/O.
export type DestinoDeDocumentos = {
  // La carpeta del bucket (`<carpeta>/<sha-256>.<ext>`).
  carpeta: string
  // Los vehículos que reciben una fila (de 1 a 100); vacío si es un repuesto.
  vehiculos: string[]
  repuestoId: string | null
  // La unidad cuyo panel debe volver a leer tras subir; nula en un grupo (no hay lista que releer).
  unidadParaAvisar: string | null
}

/** El máximo de unidades que `documento_registrar` acepta por pedido (D5 de 6.05). */
export const MAXIMO_DE_UNIDADES_POR_DOCUMENTO = 100

export function destinoDeLaUnidad(unidad: Pick<Unidad, 'tipo' | 'id'>): DestinoDeDocumentos {
  return {
    carpeta: unidad.id,
    vehiculos: unidad.tipo === 'vehiculo' ? [unidad.id] : [],
    repuestoId: unidad.tipo === 'repuesto' ? unidad.id : null,
    unidadParaAvisar: unidad.id,
  }
}

/** Las unidades de un grupo, de la más baja a la más alta por id: así la carpeta (la primera) no cambia entre un intento y su reintento. Nulo si no hay o son más de 100. */
export function destinoDelGrupo(ids: readonly string[]): DestinoDeDocumentos | null {
  const ordenados = [...new Set(ids)].sort()
  const primera = ordenados[0]
  if (primera === undefined || ordenados.length > MAXIMO_DE_UNIDADES_POR_DOCUMENTO) {
    return null
  }
  return { carpeta: primera, vehiculos: ordenados, repuestoId: null, unidadParaAvisar: null }
}
