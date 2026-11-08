import { describe, expect, it } from 'vitest'
import { ajustesDeCotizacionDesde } from './ajustes-de-cotizacion'

describe('ajustesDeCotizacionDesde', () => {
  it('pasa la fila a camelCase con la versión intacta, microsegundos incluidos', () => {
    expect(
      ajustesDeCotizacionDesde({
        vigencia_dias: 30,
        vehiculo_obligatorio_al_cotizar: false,
        actualizado_en: '2026-11-08T05:35:30.123456+00:00',
      }),
    ).toStrictEqual({
      vigenciaDias: 30,
      vehiculoObligatorioAlCotizar: false,
      actualizadoEn: '2026-11-08T05:35:30.123456+00:00',
    })
  })
})
