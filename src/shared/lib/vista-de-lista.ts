// Cómo se dibuja una lista en escritorio: la tabla o las tarjetas. Por debajo de `CORTE_DE_LA_TABLA` siempre van las tarjetas.
// La URL (`?vista=`) manda, para compartir lo que se ve; si no dice nada, la preferencia de la persona; si no eligió, la tabla.

export const VISTAS_DE_LISTA = ['tabla', 'tarjetas'] as const
export type VistaDeLista = (typeof VISTAS_DE_LISTA)[number]

export const CLAVE_DE_VISTA = 'vista'

export function esVistaDeLista(valor: unknown): valor is VistaDeLista {
  return VISTAS_DE_LISTA.some((vista) => vista === valor)
}

export function vistaDeLista({
  pedida,
  preferida,
}: {
  pedida: string | null | undefined
  preferida: VistaDeLista | null
}): VistaDeLista {
  if (esVistaDeLista(pedida)) return pedida
  return preferida ?? 'tabla'
}
