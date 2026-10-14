// El orden de un layout es relativo: «después de X», no una posición. Si otra persona agregó un
// campo entre tanto, el campo queda junto al vecino que se eligió.
type Ordenable = { id: string; grupo: string | null; activo: boolean }

export type Sentido = 'subir' | 'bajar'

// A dónde mandar un campo cuando se sube o se baja un lugar dentro de su grupo: «después de X»
// (null = primero de todo), que es lo que entiende la RPC de mover. Devuelve null en los extremos
// del grupo. `todos` incluye los desactivados: la base ordena el layout entero.
export function destinoDeMovimiento(
  todos: readonly Ordenable[],
  id: string,
  sentido: Sentido,
): { despuesDe: string | null } | null {
  const campo = todos.find((otro) => otro.id === id)
  if (!campo) {
    return null
  }
  const delGrupo = todos.filter((otro) => otro.activo && otro.grupo === campo.grupo)
  const posicion = delGrupo.findIndex((otro) => otro.id === id)
  if (sentido === 'bajar') {
    const siguiente = delGrupo[posicion + 1]
    return siguiente ? { despuesDe: siguiente.id } : null
  }
  const anterior = delGrupo[posicion - 1]
  if (!anterior) {
    return null
  }
  // Antes del anterior = después de quien está justo antes del anterior en el orden entero.
  const indice = todos.findIndex((otro) => otro.id === anterior.id)
  return { despuesDe: todos[indice - 1]?.id ?? null }
}
