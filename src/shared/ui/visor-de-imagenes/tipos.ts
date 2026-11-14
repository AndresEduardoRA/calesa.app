// Una imagen de una entidad para el visor: la miniatura (480 px, la que va en una lista) y la grande (≤ 1600 px, sólo al abrir el visor).
export type ImagenDelVisor = {
  id: string
  miniatura: string
  grande: string
}

// Cómo llegan las imágenes de una entidad: la portada (si la hay) ya está en la fila; el resto se pide recién al interactuar.
export type CargaDeImagenes = () => Promise<readonly ImagenDelVisor[] | null>

// La posición siguiente o anterior, dando la vuelta.
export function vecina(actual: number, total: number, paso: 1 | -1): number {
  if (total <= 0) return 0
  return (actual + paso + total) % total
}

// `?foto=` de la URL a un índice válido (1 = la primera); lo que no se entiende es la primera.
export function indiceDeLaUrl(valor: string | null, total: number): number {
  const n = Number(valor)
  if (!Number.isInteger(n) || n < 1 || total === 0) return 0
  return Math.min(n, total) - 1
}

// «3 de 12».
export const contador = (actual: number, total: number): string =>
  `${String(actual + 1)} de ${String(total)}`
