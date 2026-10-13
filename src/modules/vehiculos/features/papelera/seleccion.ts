// La selección del listado: qué filas eligió la persona para hacer algo con varias a la vez. Es
// de la página que está viendo: lo que deja de estar en pantalla deja de estar elegido.

export type Seleccion = ReadonlySet<string>

export const SIN_SELECCION: Seleccion = new Set<string>()

export function alternar(seleccion: Seleccion, id: string): Seleccion {
  const nueva = new Set(seleccion)
  if (!nueva.delete(id)) {
    nueva.add(id)
  }
  return nueva
}

// Todas las que se pueden elegir; si ya estaban todas, ninguna.
export function alternarTodas(seleccion: Seleccion, seleccionables: readonly string[]): Seleccion {
  return seleccionables.every((id) => seleccion.has(id)) ? SIN_SELECCION : new Set(seleccionables)
}

// Sólo lo que sigue siendo elegible en esta página.
export function vigente(seleccion: Seleccion, seleccionables: readonly string[]): Seleccion {
  return new Set(seleccionables.filter((id) => seleccion.has(id)))
}
