// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { FilaDeCotizacionAExportar } from '../../entities/exportacion'
import {
  encabezadosDeCotizaciones,
  filaDeCotizacion,
  type ContextoDeCotizaciones,
} from './columnas-de-cotizaciones'

const ZONA = 'America/La_Paz'

const contexto = (parcial: Partial<ContextoDeCotizaciones> = {}): ContextoDeCotizaciones => ({
  origenes: new Map([['o1', 'Subasta USA']]),
  clientes: new Map([['l1', 'Ana Pérez']]),
  vehiculos: new Map([['v1', 'Toyota Hilux 2020']]),
  monedaBase: 'BOB',
  zona: ZONA,
  ...parcial,
})

const fila = (parcial: Partial<FilaDeCotizacionAExportar> = {}): FilaDeCotizacionAExportar => ({
  id: 'c1',
  numero: 42,
  origenId: 'o1',
  leadId: 'l1',
  vehiculoId: 'v1',
  clase: 'preventa',
  estado: 'activa',
  titulo: 'Para Ana',
  totalBase: 98765.43,
  creadoEn: '2026-11-12T14:30:00Z',
  actualizadoEn: '2026-11-12T15:00:00Z',
  ...parcial,
})

describe('T24 · columnas de las cotizaciones a exportar', () => {
  it('el encabezado nombra la moneda base, o dice «Total» si no se pudo leer', () => {
    expect(encabezadosDeCotizaciones(contexto())).toEqual([
      'N.º',
      'Título',
      'Cliente',
      'Vehículo',
      'Origen',
      'Clase',
      'Estado',
      'Total (BOB)',
      'Creado',
      'Actualizado',
    ])
    expect(encabezadosDeCotizaciones(contexto({ monedaBase: null }))[7]).toBe('Total')
  })

  it('una fila: el número y el total tal como llegan, los nombres por sus mapas y las fechas en la zona', () => {
    expect(filaDeCotizacion(fila(), contexto())).toEqual([
      42,
      'Para Ana',
      'Ana Pérez',
      'Toyota Hilux 2020',
      'Subasta USA',
      'Preventa',
      'Activa',
      98765.43,
      '2026-11-12T10:30',
      '2026-11-12T11:00',
    ])
  })

  it('el total no se redondea ni se completa', () => {
    for (const totalBase of [0.1, 1234.5, 98765.43, 0]) {
      expect(filaDeCotizacion(fila({ totalBase }), contexto())[7]).toBe(totalBase)
    }
  })

  it('lo que no llega queda vacío: sin título, sin lead, un vehículo fuera del mapa, un origen que no está', () => {
    const celdas = filaDeCotizacion(
      fila({ titulo: null, leadId: null, vehiculoId: 'v-oculto', origenId: 'o-otro' }),
      contexto(),
    )
    expect(celdas.slice(1, 5)).toEqual(['', '', '', ''])
    expect(filaDeCotizacion(fila({ vehiculoId: null }), contexto())[3]).toBe('')
  })

  it('las dos clases y los tres estados', () => {
    expect(filaDeCotizacion(fila({ clase: 'final' }), contexto())[5]).toBe('Final')
    expect(filaDeCotizacion(fila({ estado: 'reportada' }), contexto())[6]).toBe('Reportada')
    expect(filaDeCotizacion(fila({ estado: 'invalida' }), contexto())[6]).toBe('Inválida')
  })
})
