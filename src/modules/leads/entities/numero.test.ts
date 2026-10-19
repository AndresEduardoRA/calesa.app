import { describe, expect, it } from 'vitest'
import { coincidenciaDelNumero, esEncabezadoDeNumero, numeroQueSeBusca } from './numero'

describe('numeroQueSeBusca', () => {
  it('con el permiso se busca el global y los propios de cualquier creador; sin él, sólo el propio', () => {
    expect(numeroQueSeBusca(true)).toBe('global_y_propios')
    expect(numeroQueSeBusca(false)).toBe('propio')
  })
})

describe('coincidenciaDelNumero', () => {
  const deBerta = { numero: 62, numeroPropio: 30, creadorDelPropio: 'Berta' }

  it('dice que coincide el propio de otra persona cuando el principal es el global', () => {
    expect(coincidenciaDelNumero(deBerta, 30)).toEqual({
      numeroPropio: 30,
      creadorDelPropio: 'Berta',
    })
  })

  it('dice que coincide el propio de quien mira, sin creador', () => {
    expect(
      coincidenciaDelNumero({ numero: 62, numeroPropio: 30, creadorDelPropio: null }, 30),
    ).toEqual({
      numeroPropio: 30,
      creadorDelPropio: null,
    })
  })

  it('no explica nada si coincide el principal, aunque el propio sea el mismo número', () => {
    expect(coincidenciaDelNumero(deBerta, 62)).toBeNull()
    expect(
      coincidenciaDelNumero({ numero: 30, numeroPropio: 30, creadorDelPropio: 'Berta' }, 30),
    ).toBeNull()
  })

  it('sin el global (sin el permiso) el propio ya es el principal: no hay nada que explicar', () => {
    expect(
      coincidenciaDelNumero({ numero: null, numeroPropio: 30, creadorDelPropio: null }, 30),
    ).toBeNull()
  })

  it('no explica nada sin número buscado ni con otro número', () => {
    expect(coincidenciaDelNumero(deBerta, null)).toBeNull()
    expect(coincidenciaDelNumero(deBerta, 31)).toBeNull()
    expect(
      coincidenciaDelNumero({ numero: 62, numeroPropio: null, creadorDelPropio: null }, 30),
    ).toBeNull()
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
