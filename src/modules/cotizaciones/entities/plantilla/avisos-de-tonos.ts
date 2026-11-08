// El aviso de un tono que ya no está en el catálogo (4.19-3b): lo que la ficha de `tonosQueYaNoEstan()` (4.19-2) prometió. La tarjeta cae al tono del grupo (4.18-1).
import { tonosQueYaNoEstan, type GrupoConTono } from './tonos-que-ya-no-estan'

export function avisosDeTonos(
  grupos: readonly GrupoConTono[],
  tonos: readonly string[],
  etiquetaDeGrupo: (grupo: string) => string,
): string[] {
  return tonosQueYaNoEstan(grupos, tonos).map(
    ({ grupo, tono }) =>
      `El tono «${tono}» del grupo «${etiquetaDeGrupo(grupo)}» ya no está en el catálogo: la tarjeta usa el tono del grupo. Elige otro o «Del grupo».`,
  )
}
