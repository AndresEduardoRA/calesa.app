// «La ganamos» en el hueco «Qué falta» (`?ganada=si`): el mover de siempre, pero sólo hacia fases que no son la subasta, con la siguiente abierta, y al
// confirmar se anota la subasta como ganada (`vehiculo_subasta_ganada`, todo o nada). Puro: qué se ofrece y qué se dice.
import type { SituacionDeLaUnidad } from '../nucleo/situacion'

/** La clave de URL del modo (`/logistica/vehiculo/<id>?ganada=si`); la arma también el enlace «La ganamos» de la ficha del vehículo. */
export const CLAVE_DE_GANADA = 'ganada'
export const VALOR_DE_GANADA = 'si'

export const CABECERA_DE_GANADA =
  'La ganamos: elige a qué fase pasa. Se anota como ganada al moverla.'
export const YA_NO_SIN_RESOLVER = 'Esta subasta ya no está sin resolver.'
export const SIN_DESTINOS_PARA_GANAR = 'Desde aquí no hay una fase después de la subasta.'
export const PRIMERO_LA_INICIAL =
  'Primero muévela a su fase inicial; después, «La ganamos» ofrece la siguiente.'
export const SUBASTA_SIN_RESOLVER = 'La subasta terminó y nadie dijo si la ganamos.'

/** Los destinos que «La ganamos» ofrece: los que no son una fase de subasta, en su orden. */
export function destinosParaGanar<D extends { esSubasta: boolean }>(destinos: readonly D[]): D[] {
  return destinos.filter((destino) => !destino.esSubasta)
}

export type EstadoDelModoGanada<D> =
  // Otra persona la resolvió o se movió: la lista de siempre, con el aviso.
  | { tipo: 'ya_no'; texto: string }
  | { tipo: 'sin_destinos'; texto: string }
  | { tipo: 'listo'; destinos: D[]; abierto: string }

/** Qué dibuja el hueco en el modo «La ganamos», según la situación de la unidad, su fase y sus destinos. */
export function estadoDelModoGanada<D extends { esSubasta: boolean; faseId: string }>(pedido: {
  situacion: SituacionDeLaUnidad
  faseActualId: string | null
  destinos: readonly D[]
}): EstadoDelModoGanada<D> {
  if (pedido.situacion !== 'sin_resolver') return { tipo: 'ya_no', texto: YA_NO_SIN_RESOLVER }
  const destinos = destinosParaGanar(pedido.destinos)
  const [primero] = destinos
  if (!primero) {
    return {
      tipo: 'sin_destinos',
      texto: pedido.faseActualId === null ? PRIMERO_LA_INICIAL : SIN_DESTINOS_PARA_GANAR,
    }
  }
  return { tipo: 'listo', destinos, abierto: primero.faseId }
}

export type VistaDelHueco<D> = {
  destinos: readonly D[]
  // El destino que abre solo (el primero que no es la subasta), o ninguno.
  abiertoPorDefecto: string | null
  // Mover anota la subasta ganada (sólo en el modo, con la subasta sin resolver).
  anotaGanada: boolean
  // «Desde esta fase no hay a dónde mover.» (en el modo sin destinos lo dice su propio texto).
  diceSinDestinos: boolean
}

/** Qué lista dibuja el hueco: la de siempre fuera del modo (o si ya no está sin resolver), la filtrada dentro. */
export function vistaDelHueco<D>(
  modo: EstadoDelModoGanada<D> | null,
  destinos: readonly D[],
): VistaDelHueco<D> {
  if (modo?.tipo === 'listo') {
    return {
      destinos: modo.destinos,
      abiertoPorDefecto: modo.abierto,
      anotaGanada: true,
      diceSinDestinos: false,
    }
  }
  if (modo?.tipo === 'sin_destinos') {
    return { destinos: [], abiertoPorDefecto: null, anotaGanada: false, diceSinDestinos: false }
  }
  return {
    destinos,
    abiertoPorDefecto: null,
    anotaGanada: false,
    diceSinDestinos: destinos.length === 0,
  }
}
