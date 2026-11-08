// Los grupos de una plantilla que eligen un tono que ya no está en el catálogo de la empresa (4.19-2). Es el único predicado: `tono_inexistente` de
// `validarPlantilla()` es su primero, y el editor (4.19-3) avisa con la lista entera (la tarjeta cae al tono del grupo, 4.18-1). Un grupo sin `tono` usa el del
// grupo y nunca falta. El catálogo va por `Set`: un tono como `constructor` no lo encuentra en el prototipo.

export type GrupoConTono = { readonly grupo: string; readonly tono?: string }
export type TonoQueYaNoEsta = { readonly grupo: string; readonly tono: string }

export function tonosQueYaNoEstan(
  grupos: readonly GrupoConTono[],
  tonos: readonly string[],
): readonly TonoQueYaNoEsta[] {
  const catalogo = new Set(tonos)
  return grupos.flatMap((g) =>
    g.tono !== undefined && !catalogo.has(g.tono) ? [{ grupo: g.grupo, tono: g.tono }] : [],
  )
}
