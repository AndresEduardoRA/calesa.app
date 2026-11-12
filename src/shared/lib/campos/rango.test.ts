import { describe, expect, it } from 'vitest'
import {
  fueraDeRango,
  motivoDeRango,
  problemaDelRango,
  rangoDe,
  rangoSeAcota,
  tieneRango,
} from './rango'

const SIN = { minimo: null, maximo: null }

describe('fueraDeRango (espejo de _valor_fuera_de_rango)', () => {
  it('los bordes valen y uno de más queda afuera', () => {
    const rango = { minimo: 1, maximo: 10 }
    expect(fueraDeRango(1, rango)).toBe(false)
    expect(fueraDeRango(10, rango)).toBe(false)
    expect(fueraDeRango(0.999, rango)).toBe(true)
    expect(fueraDeRango(10.001, rango)).toBe(true)
  })

  it('un límite nulo no limita', () => {
    expect(fueraDeRango(-1e9, { minimo: null, maximo: 10 })).toBe(false)
    expect(fueraDeRango(1e9, { minimo: 1, maximo: null })).toBe(false)
    expect(fueraDeRango(5, SIN)).toBe(false)
  })

  it('lo que no es un número nunca queda afuera', () => {
    const rango = { minimo: 1, maximo: 10 }
    expect(fueraDeRango(null, rango)).toBe(false)
    expect(fueraDeRango('99', rango)).toBe(false)
    expect(fueraDeRango(true, rango)).toBe(false)
    expect(fueraDeRango(Number.NaN, rango)).toBe(false)
  })
})

describe('problemaDelRango (espejo de _campo_rango)', () => {
  const base = { tipo: 'numero' as const, valorDefecto: null }

  it('sin límites no hay problema, aun en un tipo sin rango', () => {
    expect(problemaDelRango({ ...base, ...SIN })).toBeNull()
    expect(problemaDelRango({ tipo: 'texto', ...SIN, valorDefecto: 'x' })).toBeNull()
  })

  it('sólo un número o un monto lleva mínimo y máximo', () => {
    expect(
      problemaDelRango({ tipo: 'texto', minimo: null, maximo: 3, valorDefecto: null }),
    ).toEqual({
      campo: 'minimo',
      mensaje: 'Sólo un número o un monto lleva mínimo y máximo.',
    })
    expect(
      problemaDelRango({ tipo: 'moneda', minimo: 0, maximo: 3, valorDefecto: null }),
    ).toBeNull()
  })

  it('el tope es el de siempre, primero el mínimo', () => {
    expect(problemaDelRango({ ...base, minimo: -1e12 - 1, maximo: 1e13 })).toEqual({
      campo: 'minimo',
      mensaje: 'El mínimo es demasiado grande.',
    })
    expect(problemaDelRango({ ...base, minimo: -1e12, maximo: 1e12 + 1 })).toEqual({
      campo: 'maximo',
      mensaje: 'El máximo es demasiado grande.',
    })
    expect(problemaDelRango({ ...base, minimo: -1e12, maximo: 1e12 })).toBeNull()
  })

  it('el mínimo no puede pasar al máximo; iguales vale', () => {
    expect(problemaDelRango({ ...base, minimo: 5, maximo: 4 })).toEqual({
      campo: 'maximo',
      mensaje: 'El mínimo no puede ser mayor que el máximo.',
    })
    expect(problemaDelRango({ ...base, minimo: 5, maximo: 5 })).toBeNull()
  })

  it('el valor por defecto tiene que quedar adentro', () => {
    expect(problemaDelRango({ tipo: 'numero', minimo: 1, maximo: 10, valorDefecto: 11 })).toEqual({
      campo: 'valorDefecto',
      mensaje: 'El valor por defecto queda fuera del rango.',
    })
    expect(problemaDelRango({ tipo: 'numero', minimo: 1, maximo: 10, valorDefecto: 10 })).toBeNull()
  })
})

describe('rangoSeAcota', () => {
  const vigente = { minimo: 1, maximo: 10 }

  it('aparece o sube el mínimo, aparece o baja el máximo', () => {
    expect(rangoSeAcota(vigente, { minimo: 2 })).toBe(true)
    expect(rangoSeAcota(vigente, { maximo: 9 })).toBe(true)
    expect(rangoSeAcota(SIN, { minimo: -5 })).toBe(true)
    expect(rangoSeAcota(SIN, { maximo: 5 })).toBe(true)
  })

  it('quitar, ensanchar o no tocar no deja a nadie afuera', () => {
    expect(rangoSeAcota(vigente, { minimo: null, maximo: null })).toBe(false)
    expect(rangoSeAcota(vigente, { minimo: 0, maximo: 11 })).toBe(false)
    expect(rangoSeAcota(vigente, { minimo: 1, maximo: 10 })).toBe(false)
    expect(rangoSeAcota(vigente, {})).toBe(false)
  })
})

describe('rangoDe', () => {
  it('lee sólo las claves del rango que vienen', () => {
    expect(rangoDe({ etiqueta: 'x' })).toEqual({})
    expect(rangoDe({ minimo: 3, maximo: null, etiqueta: 'x' })).toEqual({ minimo: 3, maximo: null })
    expect(rangoDe({ maximo: 'diez' })).toEqual({})
  })
})

describe('motivoDeRango', () => {
  it('dice los textos de la base, con los números en el locale', () => {
    expect(motivoDeRango('Edad', { minimo: 18, maximo: 1000 }, 'es-BO')).toBe(
      '«Edad» va de 18 a 1.000.',
    )
    expect(motivoDeRango('Edad', { minimo: 0.5, maximo: null }, 'es-BO')).toBe(
      '«Edad» va desde 0,5.',
    )
    expect(motivoDeRango('Edad', { minimo: null, maximo: 99 }, 'es-BO')).toBe('«Edad» va hasta 99.')
  })
})

describe('tieneRango', () => {
  it('sólo un número o un monto', () => {
    expect(tieneRango('numero')).toBe(true)
    expect(tieneRango('moneda')).toBe(true)
    expect(tieneRango('texto')).toBe(false)
  })
})
