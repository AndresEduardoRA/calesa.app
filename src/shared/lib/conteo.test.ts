import { describe, expect, it } from 'vitest'
import {
  cortarAlTope,
  textoDelTope,
  cantidadAcotada,
  conteoAcotado,
  conteoConCambio,
  conteoCorto,
  conteoEnFrase,
} from './conteo'

describe('conteoAcotado', () => {
  it('con menos que el tope es el número exacto', () => {
    expect(conteoAcotado(0, 50)).toEqual({ n: 0, hayMas: false })
    expect(conteoAcotado(37, 50)).toEqual({ n: 37, hayMas: false })
  })

  it('con justo el tope todavía no sabe que hay más', () => {
    expect(conteoAcotado(50, 50)).toEqual({ n: 50, hayMas: false })
  })

  it('con una fila más que el tope dice que hay más y no pasa del tope', () => {
    expect(conteoAcotado(51, 50)).toEqual({ n: 50, hayMas: true })
    expect(conteoAcotado(5001, 5000)).toEqual({ n: 5000, hayMas: true })
  })
})

describe('conteoEnFrase y conteoCorto', () => {
  it('el exacto se escribe como número', () => {
    expect(conteoEnFrase({ n: 1234, hayMas: false }, { locale: 'es-BO' })).toBe('1.234')
    expect(conteoCorto({ n: 7, hayMas: false })).toBe('7')
  })

  it('el acotado dice «más de» en una frase y «+» en una cabecera', () => {
    expect(conteoEnFrase({ n: 500, hayMas: true }, { locale: 'es-BO' })).toBe('más de 500')
    expect(conteoCorto({ n: 500, hayMas: true }, { locale: 'es-BO' })).toBe('500+')
  })

  it('usa el locale de la empresa', () => {
    expect(conteoCorto({ n: 5000, hayMas: true }, { locale: 'en-US' })).toBe('5,000+')
  })
})

describe('conteoConCambio', () => {
  it('mueve el exacto y no baja de cero', () => {
    expect(conteoConCambio({ n: 3, hayMas: false }, 1, 500)).toEqual({ n: 4, hayMas: false })
    expect(conteoConCambio({ n: 0, hayMas: false }, -1, 500)).toEqual({ n: 0, hayMas: false })
  })

  it('al pasar el tope pasa a «hay más»', () => {
    expect(conteoConCambio({ n: 500, hayMas: false }, 1, 500)).toEqual({ n: 500, hayMas: true })
  })

  it('con «hay más» no se sabe cuánto es: no cambia', () => {
    expect(conteoConCambio({ n: 500, hayMas: true }, -1, 500)).toEqual({ n: 500, hayMas: true })
    expect(conteoConCambio({ n: 500, hayMas: true }, 1, 500)).toEqual({ n: 500, hayMas: true })
  })
})

describe('cantidadAcotada', () => {
  const lead = { singular: 'lead', plural: 'leads' }
  it('uno, varios y más que el tope', () => {
    expect(cantidadAcotada(1, 1000, lead)).toBe('1 lead')
    expect(cantidadAcotada(12, 1000, lead)).toBe('12 leads')
    expect(cantidadAcotada(1001, 1000, lead, { locale: 'es-BO' })).toBe('más de 1.000 leads')
  })
})

describe('cortarAlTope y textoDelTope (cierre 1)', () => {
  it('corta en el tope y dice si había más', () => {
    expect(cortarAlTope([1, 2, 3], 2)).toEqual({ filas: [1, 2], hayMas: true })
    expect(cortarAlTope([1, 2], 2)).toEqual({ filas: [1, 2], hayMas: false })
    expect(cortarAlTope([], 2)).toEqual({ filas: [], hayMas: false })
  })

  it('el texto de siempre', () => {
    expect(textoDelTope(50)).toBe('Mostrando los 50 más recientes.')
    expect(textoDelTope(1000, { sustantivo: 'cambios' })).toBe(
      'Mostrando los 1.000 cambios más recientes.',
    )
    expect(textoDelTope(20, { orden: 'primeros' })).toBe('Mostrando los 20 primeros.')
  })
})
