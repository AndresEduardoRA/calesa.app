// El primer resultado de una cotización: lo que la hoja dibuja primero, en la tarjeta del total (`totales.usd`), y la moneda con que se dibuja. Es una sola regla para
// la hoja, el total guardado y la columna «Cotización aprobada» de `/vehiculos`; espeja `_cotizacion_primer_resultado()` (la base lo congela en
// `cotizaciones_aprobadas`).

export const MONEDA_DEL_PRIMER_RESULTADO = 'USD'

export type PrimerResultado = { monto: number | null; moneda: string }

// Un total que no es un número finito no es un resultado: `monto` nulo (la celda dice «Sin total»).
export function primerResultado(totales: { usd: number | null }): PrimerResultado {
  const { usd } = totales
  return {
    monto: typeof usd === 'number' && Number.isFinite(usd) ? usd : null,
    moneda: MONEDA_DEL_PRIMER_RESULTADO,
  }
}
