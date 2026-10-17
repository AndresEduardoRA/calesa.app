import { describe, expect, it } from 'vitest'
import { esEncabezadoDeNumero, numeroQueSeBusca } from './numero'

describe('numeroQueSeBusca', () => {
  it('con el permiso se busca el global; sin él, el propio', () => {
    expect(numeroQueSeBusca(true)).toBe('global')
    expect(numeroQueSeBusca(false)).toBe('propio')
  })
})

describe('esEncabezadoDeNumero', () => {
  it.each([
    'N.º',
    'Nº',
    'N°',
    'n.º propio',
    'Número',
    'numero',
    '#',
    'Nro',
    'Nro.',
    'No.',
    'Tu n.º',
    'N.º global',
    ' # ',
  ])('«%s» parece el número de un lead', (texto) => {
    expect(esEncabezadoDeNumero(texto)).toBe(true)
  })
  it.each(['Nombre', 'Teléfono', 'Origen', 'Número de documento', 'Notas', 'No', 'Tipo', ''])(
    '«%s» no',
    (texto) => {
      expect(esEncabezadoDeNumero(texto)).toBe(false)
    },
  )
})
