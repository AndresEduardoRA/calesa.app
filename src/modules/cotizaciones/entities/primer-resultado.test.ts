import { describe, expect, it } from 'vitest'
import { MONEDA_DEL_PRIMER_RESULTADO, primerResultado } from './primer-resultado'

// Los mismos casos que `supabase/tests/areas/aprobada/reponer.sql` (R6) sobre `_cotizacion_primer_resultado()`.
describe('primerResultado', () => {
  it.each([
    [12.5, 12.5],
    [0, 0],
    [-3, -3],
    [null, null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
  ])('totales.usd %s → monto %s', (usd, monto) => {
    expect(primerResultado({ usd })).toEqual({ monto, moneda: 'USD' })
  })

  it('la moneda siempre es la del total de la hoja', () => {
    expect(MONEDA_DEL_PRIMER_RESULTADO).toBe('USD')
    expect(primerResultado({ usd: null }).moneda).toBe(MONEDA_DEL_PRIMER_RESULTADO)
  })
})
