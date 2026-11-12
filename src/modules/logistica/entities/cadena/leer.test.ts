import { describe, expect, it } from 'vitest'
import { cadenaDesde, dondeEstaDesde, paginaDeLaColumnaDesde } from './leer'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const tarjeta = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  titulo: 'Toyota Hilux',
  vin: 'VIN1',
  lote: null,
  fase_desde: '2026-11-01T10:00:00+00:00',
  demorada: false,
  contenedor: null,
  booking: null,
  eta_el: null,
  ...extra,
})

const columna = (extra: Record<string, unknown> = {}) => ({
  fase_id: B,
  nombre: 'En tránsito',
  color: '#00aaff',
  orden: 2,
  activa: true,
  es_final: false,
  demora_dias: 10,
  tarjetas: [tarjeta(A)],
  hay_mas: false,
  ...extra,
})

describe('cadenaDesde', () => {
  it('lee las columnas, con «Sin fase» de fase_id nulo, en el orden que dio la base', () => {
    const leida = cadenaDesde({
      columnas: [
        columna({ fase_id: null, nombre: null, color: null, activa: null, demora_dias: null }),
        columna({ tarjetas: [tarjeta(A, { demorada: true }), tarjeta(C)], hay_mas: true }),
      ],
    })
    expect(leida.ok).toBe(true)
    if (!leida.ok) return
    expect(leida.data.columnas.map((c) => c.faseId)).toEqual([null, B])
    expect(leida.data.columnas[0]?.nombre).toBeNull()
    expect(leida.data.columnas[1]?.tarjetas.map((t) => t.id)).toEqual([A, C])
    expect(leida.data.columnas[1]?.tarjetas[0]?.demorada).toBe(true)
    expect(leida.data.columnas[1]?.hayMas).toBe(true)
    // Mientras la infra no arma la identidad, el nombre de la tarjeta es el título.
    expect(leida.data.columnas[1]?.tarjetas[0]?.nombre).toBe('Toyota Hilux')
  })

  it('sin columnas es una cadena vacía válida', () => {
    expect(cadenaDesde({ columnas: [] })).toEqual({ ok: true, data: { columnas: [] } })
  })

  it('una forma ajena es «inesperado», nunca una columna cortada', () => {
    for (const mala of [
      null,
      {},
      { columnas: 'x' },
      { columnas: [columna({ tarjetas: [{ id: 'no-es-guid' }] })] },
      { columnas: [columna({ fase_id: 'no-es-guid' })] },
      { columnas: [columna({ hay_mas: 'sí' })] },
    ]) {
      const leida = cadenaDesde(mala)
      expect(leida.ok).toBe(false)
      if (!leida.ok) expect(leida.error.codigo).toBe('inesperado')
    }
  })
})

describe('paginaDeLaColumnaDesde', () => {
  it('lee las tarjetas y si hay más', () => {
    const leida = paginaDeLaColumnaDesde({ tarjetas: [tarjeta(A)], hay_mas: true })
    expect(leida.ok && leida.data.hayMas).toBe(true)
    expect(leida.ok && leida.data.tarjetas[0]?.id).toBe(A)
  })

  it('un id que no es guid es «inesperado»', () => {
    expect(paginaDeLaColumnaDesde({ tarjetas: [tarjeta('x')], hay_mas: false }).ok).toBe(false)
  })
})

describe('dondeEstaDesde', () => {
  const unidad = {
    id: A,
    origen_id: B,
    titulo: 'Hilux',
    vin: 'VIN1',
    lote: null,
    fase_id: C,
    fase_nombre: 'En puerto',
    fase_color: null,
    fase_desde: '2026-11-01T10:00:00+00:00',
    eta_el: null,
  }

  it('lee las unidades con su fase y su origen', () => {
    const leida = dondeEstaDesde({ unidades: [unidad], hay_mas: false })
    expect(leida.ok && leida.data.unidades[0]).toMatchObject({
      id: A,
      origenId: B,
      faseNombre: 'En puerto',
    })
  })

  it('un vehículo sin fase llega con fase nula', () => {
    const leida = dondeEstaDesde({
      unidades: [{ ...unidad, fase_id: null, fase_nombre: null }],
      hay_mas: true,
    })
    expect(leida.ok && leida.data.unidades[0]?.faseId).toBeNull()
    expect(leida.ok && leida.data.hayMas).toBe(true)
  })

  it('una forma ajena es «inesperado»', () => {
    expect(dondeEstaDesde({ unidades: [{ ...unidad, origen_id: 'x' }], hay_mas: false }).ok).toBe(
      false,
    )
    expect(dondeEstaDesde(undefined).ok).toBe(false)
  })
})
