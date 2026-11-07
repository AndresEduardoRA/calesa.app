import { describe, expect, it } from 'vitest'
import { faltanPorMostrar, loteDesde, lotesDesde } from './lotes'

const L = '33333333-3333-4333-8333-333333333333'
const C = '44444444-4444-4444-8444-444444444444'
const O = '55555555-5555-4555-8555-555555555555'

const cotizacion = (extra: Record<string, unknown> = {}) => ({
  id: C,
  numero: 7,
  titulo: 'Cotización #7',
  clase: 'preventa',
  origen_id: O,
  creado_en: '2026-11-06T10:00:00.123456+00:00',
  ...extra,
})

const lote = (extra: Record<string, unknown> = {}) => ({
  id: L,
  actualizado_en: '2026-11-06T11:00:00.654321+00:00',
  creado_en: '2026-11-06T10:30:00.111111+00:00',
  creado_por_nombre: 'Ana',
  es_mio: true,
  purga_el: '2026-12-06T10:30:00.111111+00:00',
  enviados: 3,
  en_papelera: 2,
  cotizaciones: [cotizacion()],
  ...extra,
})

describe('lotesDesde', () => {
  it('lee los lotes con las claves que da la base, sin perder los microsegundos', () => {
    const lotes = lotesDesde([lote()])
    expect(lotes).toEqual([
      {
        id: L,
        actualizadoEn: '2026-11-06T11:00:00.654321+00:00',
        creadoEn: '2026-11-06T10:30:00.111111+00:00',
        creadoPorNombre: 'Ana',
        esMio: true,
        purgaEl: '2026-12-06T10:30:00.111111+00:00',
        enviados: 3,
        enPapelera: 2,
        cotizaciones: [
          {
            id: C,
            numero: 7,
            titulo: 'Cotización #7',
            clase: 'preventa',
            origenId: O,
            creadoEn: '2026-11-06T10:00:00.123456+00:00',
          },
        ],
      },
    ])
  })

  it('una lista vacía es una papelera vacía, no una forma rota', () => {
    expect(lotesDesde([])).toEqual([])
  })

  it('un lote sin cotizaciones a la vista (nulo) queda con la lista vacía', () => {
    expect(lotesDesde([lote({ cotizaciones: null })])?.[0]?.cotizaciones).toEqual([])
  })

  it('una clave de más no rompe', () => {
    expect(lotesDesde([lote({ otra: 1 })])).not.toBeNull()
    expect(lotesDesde([lote({ cotizaciones: [cotizacion({ total: 1 })] })])).not.toBeNull()
  })

  it('una clave de menos, un tipo roto o una clase desconocida es null', () => {
    const { purga_el: _quitada, ...sinPurga } = lote()
    expect(lotesDesde([sinPurga])).toBeNull()
    expect(lotesDesde([lote({ en_papelera: 'dos' })])).toBeNull()
    expect(lotesDesde([lote({ id: 'no-es-un-guid' })])).toBeNull()
    expect(lotesDesde([lote({ cotizaciones: [cotizacion({ clase: 'otra' })] })])).toBeNull()
    expect(lotesDesde({})).toBeNull()
    expect(lotesDesde(null)).toBeNull()
  })

  it('el origen puede venir nulo', () => {
    const lotes = lotesDesde([lote({ cotizaciones: [cotizacion({ origen_id: null })] })])
    expect(lotes?.[0]?.cotizaciones[0]?.origenId).toBeNull()
  })
})

describe('loteDesde', () => {
  it('lee un lote', () => {
    expect(loteDesde(lote())?.id).toBe(L)
  })

  it('nulo es que el lote ya no está', () => {
    expect(loteDesde(null)).toBeNull()
  })

  it('una forma rota es null', () => {
    expect(loteDesde({ id: L })).toBeNull()
    expect(loteDesde([lote()])).toBeNull()
  })
})

describe('faltanPorMostrar', () => {
  it('lo que está en la papelera menos lo que se ve, sin bajar de cero', () => {
    expect(
      faltanPorMostrar({
        enPapelera: 25,
        cotizaciones: Array.from({ length: 20 }, cotizacion) as never,
      }),
    ).toBe(5)
    expect(faltanPorMostrar({ enPapelera: 2, cotizaciones: [] })).toBe(2)
    expect(
      faltanPorMostrar({
        enPapelera: 1,
        cotizaciones: Array.from({ length: 3 }, cotizacion) as never,
      }),
    ).toBe(0)
  })
})
