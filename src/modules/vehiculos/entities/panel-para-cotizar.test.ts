import { describe, expect, it } from 'vitest'
import {
  COLUMNAS_DEL_PANEL,
  desdeDelCierre,
  elegidoDesde,
  instanteDelPanel,
  listaDelPanel,
  MARGEN_DEL_CIERRE_EN_HORAS,
  ORDEN_DEL_PANEL,
  referenciaDelVehiculo,
  vehiculosDelPanelDesde,
} from './panel-para-cotizar'
import type { Vehiculo } from './vehiculo'

const ID = '00000000-0000-4000-8000-000000000001'
const fila = (cambios: Record<string, unknown> = {}) => ({
  id: ID,
  numero: 7,
  titulo: 'Toyota Corolla 2020',
  anio: 2020,
  lote: '4455',
  precio: 12000,
  cotizado_en: '2026-10-29T08:00:00.123456+00:00',
  cierre_subasta_en: null,
  vehiculos_imagenes: [{ ruta_miniatura: 'v/abc.webp' }],
  ...cambios,
})

describe('el margen de «Cierre subasta»', () => {
  it('son 24 horas antes de ahora, en ISO', () => {
    expect(MARGEN_DEL_CIERRE_EN_HORAS).toBe(24)
    expect(desdeDelCierre(new Date('2026-10-29T12:00:00.000Z'))).toBe('2026-10-28T12:00:00.000Z')
  })
})

describe('listaDelPanel', () => {
  it('«Cierre subasta» sólo en un origen de subasta; lo demás es «Últ. cotización»', () => {
    expect(listaDelPanel('cierre', true)).toBe('cierre')
    expect(listaDelPanel('cierre', false)).toBe('ultima')
    expect(listaDelPanel('ultima', true)).toBe('ultima')
    expect(listaDelPanel(null, true)).toBe('ultima')
    expect(listaDelPanel('otra', true)).toBe('ultima')
  })

  it('cada lista camina su columna: lo cotizado de lo más nuevo, el cierre de lo más próximo', () => {
    expect(ORDEN_DEL_PANEL.ultima).toEqual({ columna: 'cotizado_en', ascendente: false })
    expect(ORDEN_DEL_PANEL.cierre).toEqual({ columna: 'cierre_subasta_en', ascendente: true })
    expect(COLUMNAS_DEL_PANEL).toContain('cotizado_en')
    expect(COLUMNAS_DEL_PANEL).toContain('cierre_subasta_en')
  })
})

describe('vehiculosDelPanelDesde', () => {
  it('mapea la fila y toma la miniatura de la portada', () => {
    expect(vehiculosDelPanelDesde([fila()], 'ultima')).toEqual([
      {
        id: ID,
        numero: 7,
        titulo: 'Toyota Corolla 2020',
        anio: 2020,
        lote: '4455',
        precio: 12000,
        cotizadoEn: '2026-10-29T08:00:00.123456+00:00',
        cierreSubastaEn: null,
        portadaRuta: 'v/abc.webp',
      },
    ])
    expect(
      vehiculosDelPanelDesde([fila({ vehiculos_imagenes: [] })], 'ultima')?.[0]?.portadaRuta,
    ).toBeNull()
  })

  it('una fila sin el instante de su lista hace de la lectura un error', () => {
    expect(vehiculosDelPanelDesde([fila()], 'cierre')).toBeNull()
    expect(vehiculosDelPanelDesde([fila({ cotizado_en: null })], 'ultima')).toBeNull()
    expect(vehiculosDelPanelDesde([], 'cierre')).toEqual([])
  })

  it('una fila que no es un vehículo no pasa', () => {
    expect(() => vehiculosDelPanelDesde([{ id: 'no' }], 'ultima')).toThrow()
  })

  it('instanteDelPanel da la columna de cada lista', () => {
    const [vehiculo] =
      vehiculosDelPanelDesde(
        [fila({ cierre_subasta_en: '2026-10-30T10:00:00+00:00' })],
        'cierre',
      ) ?? []
    expect(vehiculo && instanteDelPanel('ultima', vehiculo)).toBe(
      '2026-10-29T08:00:00.123456+00:00',
    )
    expect(vehiculo && instanteDelPanel('cierre', vehiculo)).toBe('2026-10-30T10:00:00+00:00')
  })
})

describe('el vehículo elegido', () => {
  it('lleva sólo lo que dibujan la barra y el panel', () => {
    const vehiculo = {
      id: ID,
      numero: 7,
      titulo: 'Toyota',
      lote: null,
      portadaRuta: null,
      atributos: { color: 'rojo' },
    } as unknown as Vehiculo
    expect(elegidoDesde(vehiculo)).toEqual({
      id: ID,
      numero: 7,
      titulo: 'Toyota',
      lote: null,
      portadaRuta: null,
    })
  })

  it('su referencia es el número y, si tiene, el lote', () => {
    expect(referenciaDelVehiculo({ numero: 7, lote: '4455' })).toBe('#7 · Lote 4455')
    expect(referenciaDelVehiculo({ numero: 7, lote: null })).toBe('#7')
  })
})
