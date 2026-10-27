import { describe, expect, it } from 'vitest'
import { esperaAlRecalculo, motivoParaNoGuardar } from './se-puede-guardar'

const LIBRE = {
  estado: { tipo: 'al_dia' } as const,
  leadId: 'l',
  faltaVehiculo: false,
  total: { tipo: 'valor', usd: 10 } as const,
  descartoLoTipeado: false,
}

describe('motivoParaNoGuardar', () => {
  it('al día, con lead y con total, se guarda', () => {
    expect(motivoParaNoGuardar(LIBRE)).toBeNull()
  })

  it('no se guarda con un total viejo: el recálculo falló', () => {
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'fallo', recargar: false } })).toMatch(
      /recalcular/,
    )
  })

  it('sin la variante elegida, sin lead o sin el vehículo que el ajuste pide, tampoco', () => {
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'sin_variante' } })).not.toBeNull()
    expect(motivoParaNoGuardar({ ...LIBRE, leadId: null })).toBe(
      'Para guardar, abre la hoja desde un lead.',
    )
    expect(motivoParaNoGuardar({ ...LIBRE, faltaVehiculo: true })).toBe(
      'Este origen pide un vehículo para guardar.',
    )
  })

  it('con el total nulo dice el motivo del resumen, y un valor descartado el suyo (P9)', () => {
    expect(
      motivoParaNoGuardar({
        ...LIBRE,
        total: { tipo: 'faltante', motivo: 'Revisa las celdas con aviso.' },
      }),
    ).toBe('Revisa las celdas con aviso.')
    expect(motivoParaNoGuardar({ ...LIBRE, descartoLoTipeado: true })).toMatch(/no acepta/)
  })

  it('mientras recalcula no es un motivo: se espera (P8)', () => {
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'esperando' } })).toBeNull()
    expect(motivoParaNoGuardar({ ...LIBRE, estado: { tipo: 'recalculando' } })).toBeNull()
  })
})

describe('esperaAlRecalculo', () => {
  it('espera mientras se espera o se recalcula; al día o en fallo, no', () => {
    expect(esperaAlRecalculo({ tipo: 'esperando' })).toBe(true)
    expect(esperaAlRecalculo({ tipo: 'recalculando' })).toBe(true)
    expect(esperaAlRecalculo({ tipo: 'al_dia' })).toBe(false)
    expect(esperaAlRecalculo({ tipo: 'fallo', recargar: false })).toBe(false)
  })
})
