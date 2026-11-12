import { describe, expect, it } from 'vitest'
import { periodoDesde, ventanaDelPeriodo } from './periodo'

describe('periodoDesde', () => {
  it('un valor ausente o desconocido es «mes»', () => {
    expect(periodoDesde(undefined)).toBe('mes')
    expect(periodoDesde('cualquier-cosa')).toBe('mes')
    expect(periodoDesde(['90d', 'mes'])).toBe('mes')
    expect(periodoDesde('90d')).toBe('90d')
    expect(periodoDesde('mes-anterior')).toBe('mes-anterior')
  })
})

describe('ventanaDelPeriodo', () => {
  it('el día 1 de un mes: del 1 a hoy; el mes anterior es el mes entero', () => {
    expect(ventanaDelPeriodo('mes', '2026-11-01')).toMatchObject({
      desde: '2026-11-01',
      hasta: '2026-11-01',
    })
    expect(ventanaDelPeriodo('mes-anterior', '2026-11-01')).toMatchObject({
      desde: '2026-10-01',
      hasta: '2026-10-31',
    })
  })

  it('el 31 de un mes', () => {
    expect(ventanaDelPeriodo('mes', '2026-10-31')).toMatchObject({
      desde: '2026-10-01',
      hasta: '2026-10-31',
    })
    expect(ventanaDelPeriodo('mes-anterior', '2026-10-31')).toMatchObject({
      desde: '2026-09-01',
      hasta: '2026-09-30',
    })
  })

  it('marzo mira febrero: bisiesto y no', () => {
    expect(ventanaDelPeriodo('mes-anterior', '2028-03-15')).toMatchObject({
      desde: '2028-02-01',
      hasta: '2028-02-29',
    })
    expect(ventanaDelPeriodo('mes-anterior', '2027-03-15')).toMatchObject({
      desde: '2027-02-01',
      hasta: '2027-02-28',
    })
  })

  it('enero mira diciembre del año anterior', () => {
    expect(ventanaDelPeriodo('mes-anterior', '2027-01-10')).toMatchObject({
      desde: '2026-12-01',
      hasta: '2026-12-31',
    })
  })

  it('90 días cuentan hoy y cruzan el año', () => {
    expect(ventanaDelPeriodo('90d', '2027-02-10')).toMatchObject({
      desde: '2026-11-13',
      hasta: '2027-02-10',
    })
  })

  it('cada período lleva su etiqueta', () => {
    expect(ventanaDelPeriodo('mes', '2026-11-12').etiqueta).toBe('Este mes')
    expect(ventanaDelPeriodo('mes-anterior', '2026-11-12').etiqueta).toBe('Mes anterior')
    expect(ventanaDelPeriodo('90d', '2026-11-12').etiqueta).toBe('Últimos 90 días')
  })
})
