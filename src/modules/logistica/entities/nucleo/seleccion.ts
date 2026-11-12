// La selección de unidades de la cadena para mover en lote (6.04-3): reglas puras, sin I/O. Una sola fase a la vez (D1 de 6.04: un lote no mezcla fases) y hasta 200 (el tope de
// `cambiar_fase_lote`). Es un número que elige la persona, no un total de la base.

/** El tope de una selección: el mismo que el de `cambiar_fase_lote` (`TOPE_DEL_LOTE` de `flujos`; un test los compara). */
export const TOPE_DE_LA_SELECCION = 200

export const AVISO_DE_OTRA_FASE = 'Elegiste en otra fase: se vació la selección anterior.'

export type FaseElegida = { id: string; nombre: string }

export type UnidadElegida = { id: string; nombre: string }

export type EstadoDeLaSeleccion = {
  // La fase de lo elegido; nula si no hay nada elegido.
  fase: FaseElegida | null
  elegidos: ReadonlyMap<string, { nombre: string }>
  // Lo que acaba de pasar y la persona debe saber (cambió de fase, llegó al tope).
  aviso: string | null
  // «Elegir los de esta columna» no cupo entera.
  recortada: boolean
}

export const SELECCION_VACIA: EstadoDeLaSeleccion = {
  fase: null,
  elegidos: new Map(),
  aviso: null,
  recortada: false,
}

/** Lo elegido, en el orden en que se eligió. */
export function idsElegidos(estado: EstadoDeLaSeleccion): string[] {
  return [...estado.elegidos.keys()]
}

function baseParaLaFase(estado: EstadoDeLaSeleccion, fase: FaseElegida) {
  if (estado.fase !== null && estado.fase.id !== fase.id && estado.elegidos.size > 0) {
    return { elegidos: new Map<string, { nombre: string }>(), aviso: AVISO_DE_OTRA_FASE }
  }
  return { elegidos: new Map(estado.elegidos), aviso: null }
}

/** Elegir o quitar una unidad. Elegir en otra fase empieza una selección nueva y lo avisa. */
export function alternar(
  estado: EstadoDeLaSeleccion,
  fase: FaseElegida,
  unidad: UnidadElegida,
): EstadoDeLaSeleccion {
  const { elegidos, aviso } = baseParaLaFase(estado, fase)
  if (elegidos.has(unidad.id)) {
    elegidos.delete(unidad.id)
    return {
      fase: elegidos.size === 0 ? null : fase,
      elegidos,
      aviso: null,
      recortada: false,
    }
  }
  if (elegidos.size >= TOPE_DE_LA_SELECCION) {
    return { ...estado, aviso: 'Ya elegiste 200: es lo más que se mueve de una vez.' }
  }
  elegidos.set(unidad.id, { nombre: unidad.nombre })
  return { fase, elegidos, aviso, recortada: false }
}

/** «Elegir los de esta columna»: lo cargado, hasta el tope. Si no cupo todo, `recortada`. */
export function elegirLaColumna(
  estado: EstadoDeLaSeleccion,
  fase: FaseElegida,
  unidades: readonly UnidadElegida[],
): EstadoDeLaSeleccion {
  const { elegidos, aviso } = baseParaLaFase(estado, fase)
  let recortada = false
  for (const unidad of unidades) {
    if (elegidos.has(unidad.id)) continue
    if (elegidos.size >= TOPE_DE_LA_SELECCION) {
      recortada = true
      break
    }
    elegidos.set(unidad.id, { nombre: unidad.nombre })
  }
  return { fase: elegidos.size === 0 ? null : fase, elegidos, aviso, recortada }
}

export function vaciar(): EstadoDeLaSeleccion {
  return SELECCION_VACIA
}
