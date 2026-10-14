import { describe, expect, it } from 'vitest'
import { datosNuevosDesde, textoDeDatosNuevos } from './datos-nuevos-de-apibara'

describe('datosNuevosDesde', () => {
  it('lee lo que devuelve la base', () => {
    expect(
      datosNuevosDesde([
        { ruta: 'pricing.nuevo', tipo: 'number', ejemplo: '10' },
        { ruta: 'x.y', tipo: 'boolean', ejemplo: null },
      ]),
    ).toEqual([
      { ruta: 'pricing.nuevo', tipo: 'number', ejemplo: '10' },
      { ruta: 'x.y', tipo: 'boolean', ejemplo: null },
    ])
  })

  it('un tipo desconocido se toma por texto, y algo que no es una lista no tiene datos', () => {
    expect(datosNuevosDesde([{ ruta: 'a', tipo: 'object', ejemplo: null }])[0]?.tipo).toBe('string')
    expect(datosNuevosDesde(null)).toEqual([])
    expect(datosNuevosDesde([{ tipo: 'number' }])).toEqual([])
  })
})

describe('textoDeDatosNuevos', () => {
  it('concuerda con la cantidad', () => {
    expect(textoDeDatosNuevos(1)).toBe('apibara trae 1 dato que este origen no usa.')
    expect(textoDeDatosNuevos(4)).toBe('apibara trae 4 datos que este origen no usa.')
  })
})
