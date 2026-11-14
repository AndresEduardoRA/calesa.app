import { describe, expect, it } from 'vitest'
import { ayudaDeZona, borradorDeFechas, cambiosDeFechas, validarFechas } from './fechas-de-subasta'

const NY = 'America/New_York'

describe('fechas de la subasta', () => {
  it('lo escrito en la zona de quien edita se guarda como instante en UTC, también al cambiar el horario', () => {
    // 2.º domingo de marzo: a las 10:00 Nueva York ya está en EDT (UTC−4).
    expect(validarFechas({ inicio: '2026-03-08T10:00', cierre: '' }, NY)).toEqual({
      ok: true,
      datos: { subastaEn: '2026-03-08T14:00:00.000Z', subastaFinEn: null },
    })
    // Un día antes, EST (UTC−5).
    expect(validarFechas({ inicio: '2026-03-07T10:00', cierre: '' }, NY)).toMatchObject({
      datos: { subastaEn: '2026-03-07T15:00:00.000Z' },
    })
  })

  it('el borrador muestra el instante guardado en la zona de quien edita', () => {
    expect(borradorDeFechas({ subastaEn: '2026-03-08T14:00:00Z', subastaFinEn: null }, NY)).toEqual(
      { inicio: '2026-03-08T10:00', cierre: '' },
    )
  })

  it('vacío borra; incompleto o un cierre antes del inicio, no', () => {
    expect(validarFechas({ inicio: '', cierre: '' }, NY)).toEqual({
      ok: true,
      datos: { subastaEn: null, subastaFinEn: null },
    })
    expect(validarFechas({ inicio: '2026-03-08', cierre: '' }, NY)).toMatchObject({
      ok: false,
      errores: { inicio: 'Escribe la fecha y la hora completas.' },
    })
    expect(
      validarFechas({ inicio: '2026-03-08T10:00', cierre: '2026-03-08T09:59' }, NY),
    ).toMatchObject({ ok: false, errores: { cierre: 'El cierre no puede ser antes del inicio.' } })
  })

  it('sólo manda lo que cambió (el mismo instante escrito distinto no es un cambio)', () => {
    const original = { subastaEn: '2026-03-08T14:00:00Z', subastaFinEn: null }
    expect(
      cambiosDeFechas(original, { subastaEn: '2026-03-08T14:00:00.000Z', subastaFinEn: null }),
    ).toBeNull()
    expect(cambiosDeFechas(original, { subastaEn: null, subastaFinEn: null })).toEqual({
      subasta_en: null,
    })
    expect(
      cambiosDeFechas(original, {
        subastaEn: original.subastaEn,
        subastaFinEn: '2026-03-08T16:00:00.000Z',
      }),
    ).toEqual({ subasta_fin_en: '2026-03-08T16:00:00.000Z' })
  })

  it('la ayuda nombra la zona y su desfase en ese momento', () => {
    expect(ayudaDeZona(NY, '2026-03-08T14:00:00Z', '2026-01-01T00:00:00Z')).toMatch(
      /^Se escribe en hora de America\/New_York \(.+\)\.$/,
    )
  })
})
