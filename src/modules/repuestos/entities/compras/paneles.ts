// El formulario de una compra en la URL de `/repuestos/[id]` (8.11-3, C4): `?panel=compra&compra=<id|nueva>`, junto a `?pestana=compras`.
export const PANEL_COMPRA = 'compra'
export const CLAVE_DE_COMPRA = 'compra'
export const COMPRA_NUEVA = 'nueva'
export const MENSAJE_COMPRA_YA_NO_ESTA = 'Esa compra ya no está.'

/** La compra que nombra la URL: nula si falta, si es `nueva` o si ya no está entre las filas. */
export function compraDeLaUrl<C extends { id: string }>(
  filas: readonly C[],
  valor: string | null,
): C | null {
  if (valor === null || valor === COMPRA_NUEVA) return null
  return filas.find((f) => f.id === valor) ?? null
}
