// La lista de roles que acota quién mueve (a una fase o por una salida), editada de a un rol (5.06-2). Sin I/O.

// Marca o desmarca un solo rol y conserva todo lo demás: los ids que el selector no muestra (más de 100 roles) no se borran al guardar.
export function alternarRol(
  actuales: readonly string[],
  rolId: string,
  marcado: boolean,
): string[] {
  const resto = actuales.filter((id) => id !== rolId)
  return marcado ? [...resto, rolId] : resto
}

// La firma de una lista: sus ids sin repetir y en orden. Sirve para comparar y para reiniciar un borrador cuando lo guardado cambió.
export function firmaDeRoles(roles: readonly string[]): string {
  return [...new Set(roles)].sort().join(',')
}

// Dos listas son la misma si tienen los mismos roles, sin importar el orden ni los repetidos.
export function mismosRoles(a: readonly string[], b: readonly string[]): boolean {
  return firmaDeRoles(a) === firmaDeRoles(b)
}
