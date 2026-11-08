import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { motivoParaNoMarcar, puedeMarcarFinales, puedeMarcarLaFinal } from './acceso'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '22222222-2222-4222-8222-222222222222'
const VEHICULO = '33333333-3333-4333-8333-333333333333'
const LEAD = '44444444-4444-4444-8444-444444444444'

const con = (clave: string, origenId: string | null = null): Permisos =>
  [{ clave, origenId, alcance: 'todos' as const }] as Permisos

const preventa = { clase: 'preventa' as const, origenId: ORIGEN }

describe('puedeMarcarLaFinal', () => {
  it('una preventa, con la clave de su origen o de todos', () => {
    expect(puedeMarcarLaFinal(preventa, con('cotizaciones.final.gestionar', ORIGEN))).toBe(true)
    expect(puedeMarcarLaFinal(preventa, con('cotizaciones.final.gestionar'))).toBe(true)
  })

  it('una final no', () => {
    expect(
      puedeMarcarLaFinal({ ...preventa, clase: 'final' }, con('cotizaciones.final.gestionar')),
    ).toBe(false)
  })

  it('con la clave de otro origen, o sin ella, no', () => {
    expect(puedeMarcarLaFinal(preventa, con('cotizaciones.final.gestionar', OTRO_ORIGEN))).toBe(
      false,
    )
    expect(puedeMarcarLaFinal(preventa, con('cotizaciones.editar'))).toBe(false)
    expect(puedeMarcarLaFinal(preventa, [])).toBe(false)
  })
})

describe('motivoParaNoMarcar', () => {
  const completa = { vehiculoId: VEHICULO, leadId: LEAD }

  it('con vehículo y lead no hay motivo', () => {
    expect(motivoParaNoMarcar(completa, true)).toBeNull()
    expect(motivoParaNoMarcar(completa, false)).toBeNull()
  })

  it('sin vehículo: lo pide a quien puede guardar, o que se lo pida a quien la cotizó', () => {
    const sinVehiculo = { ...completa, vehiculoId: null }
    expect(motivoParaNoMarcar(sinVehiculo, true)).toBe(
      'Para marcarla final, elige el vehículo y guarda.',
    )
    expect(motivoParaNoMarcar(sinVehiculo, false)).toBe(
      'Para marcarla final le falta el vehículo: pídeselo a quien la cotizó.',
    )
  })

  it('sin lead: igual con el cliente', () => {
    const sinLead = { ...completa, leadId: null }
    expect(motivoParaNoMarcar(sinLead, true)).toBe(
      'Para marcarla final, elige el cliente y guarda.',
    )
    expect(motivoParaNoMarcar(sinLead, false)).toBe(
      'Para marcarla final le falta el cliente: pídeselo a quien la cotizó.',
    )
  })

  it('sin los dos gana el vehículo, como la base', () => {
    expect(motivoParaNoMarcar({ vehiculoId: null, leadId: null }, true)).toBe(
      'Para marcarla final, elige el vehículo y guarda.',
    )
  })
})

describe('puedeMarcarFinales', () => {
  it('con la clave en algún origen sí; sin ella no', () => {
    expect(puedeMarcarFinales(con('cotizaciones.final.gestionar', OTRO_ORIGEN))).toBe(true)
    expect(puedeMarcarFinales(con('cotizaciones.moderar'))).toBe(false)
    expect(puedeMarcarFinales([])).toBe(false)
  })
})
