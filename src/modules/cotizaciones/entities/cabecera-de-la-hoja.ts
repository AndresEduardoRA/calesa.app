// La cabecera de la hoja (`cotizacion_hoja()` › `cabecera`): lo que es del diseño entero y no de una sección. Reglas puras, cero I/O.

// El modo de tipo de cambio con que abre la hoja (P1): el primero de los que declara el diseño, marcado; nulo si no declara ninguno.
export function modoInicial(cabecera: { modos: readonly { clave: string }[] }): string | null {
  return cabecera.modos[0]?.clave ?? null
}
