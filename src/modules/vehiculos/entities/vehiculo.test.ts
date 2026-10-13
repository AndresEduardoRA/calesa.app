import { describe, expect, it } from 'vitest'
import { COLUMNAS_DE_VEHICULO, vehiculosDesde } from './vehiculo'

const FILA = {
  id: '00000000-0000-0000-0000-000000000001',
  numero: 12,
  origen_id: '00000000-0000-0000-0000-0000000000aa',
  titulo: '2021 Toyota RAV4',
  marca: 'Toyota',
  modelo: 'RAV4',
  anio: 2021,
  vin: 'JTMW1RFV8MD012345',
  lote: null,
  plataforma: null,
  url_origen: null,
  precio: 24500.5,
  precio_negociable: true,
  acepta_permuta: null,
  placado: false,
  kilometraje: 42000,
  categoria_id: null,
  fase_id: null,
  atributos: { color: 'Gris', cilindros: 4 },
  creado_por: '00000000-0000-0000-0000-0000000000bb',
  creado_en: '2026-10-13T12:00:00.123456+00:00',
  actualizado_en: '2026-10-13T12:05:00.654321+00:00',
}

describe('vehiculosDesde', () => {
  it('lee las columnas que pide', () => {
    const [vehiculo] = vehiculosDesde([FILA])
    expect(vehiculo).toMatchObject({
      numero: 12,
      titulo: '2021 Toyota RAV4',
      precio: 24500.5,
      faseId: null,
      atributos: { color: 'Gris', cilindros: 4 },
      // La versión viaja como texto, con sus microsegundos.
      actualizadoEn: '2026-10-13T12:05:00.654321+00:00',
    })
    for (const columna of Object.keys(FILA)) {
      expect(COLUMNAS_DE_VEHICULO.split(', ')).toContain(columna)
    }
  })

  it('conserva el orden de la consulta', () => {
    const otra = { ...FILA, id: '00000000-0000-0000-0000-000000000002', numero: 13 }
    expect(vehiculosDesde([otra, FILA]).map((uno) => uno.numero)).toEqual([13, 12])
  })

  it('unos atributos ilegibles no tumban la lista', () => {
    expect(vehiculosDesde([{ ...FILA, atributos: 'roto' }])[0]?.atributos).toEqual({})
  })

  it('una fila sin título se rechaza', () => {
    expect(() => vehiculosDesde([{ ...FILA, titulo: null }])).toThrow()
  })
})
