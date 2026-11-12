// Los orígenes que dibuja la cadena como pestañas (6.03-1): los activos donde la persona tiene `logistica.ver` y el flujo de vehículos tiene la regla `logistica` encendida.
export type OrigenDeLaCadena = { id: string; nombre: string; color: string | null }

/** El origen de `?origen=`: el pedido si está entre las pestañas; si no (ajeno, inválido, vacío), la primera; nulo si no hay ninguna. Nunca un error. */
export function origenElegido(
  origenes: readonly OrigenDeLaCadena[],
  parametro: string | null | undefined,
): OrigenDeLaCadena | null {
  return origenes.find((origen) => origen.id === parametro) ?? origenes[0] ?? null
}
