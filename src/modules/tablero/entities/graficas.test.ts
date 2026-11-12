import { describe, expect, it } from 'vitest'
import {
  TOPE_DE_ORIGENES,
  TOPE_DE_PERSONAS,
  fraccion,
  marcasDeDias,
  nombreDeOrigen,
  nombreDePersona,
  notaDeTope,
  techoDeEscala,
  textoDeBarra,
  textoDeFila,
} from './graficas'

describe('techoDeEscala', () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 5],
    [5, 5],
    [7, 10],
    [10, 10],
    [11, 20],
    [21, 50],
    [51, 100],
    [101, 200],
  ])('el techo de %i es %i', (maximo, techo) => {
    expect(techoDeEscala(maximo)).toBe(techo)
  })

  it('un valor negativo o que no es un número cae en 1', () => {
    expect(techoDeEscala(-4)).toBe(1)
    expect(techoDeEscala(Number.NaN)).toBe(1)
  })
})

describe('fraccion', () => {
  it('queda entre 0 y 1 y nunca es NaN', () => {
    expect(fraccion(5, 10)).toBe(0.5)
    expect(fraccion(0, 10)).toBe(0)
    expect(fraccion(20, 10)).toBe(1)
    expect(fraccion(-3, 10)).toBe(0)
    expect(fraccion(3, 0)).toBe(0)
    expect(fraccion(Number.NaN, 10)).toBe(0)
  })
})

describe('marcasDeDias', () => {
  const dias = (n: number) =>
    Array.from({ length: n }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)

  it('siempre trae el primero y el último, sin repetir ni pasar del máximo', () => {
    for (const n of [2, 7, 28, 30, 31]) {
      const marcas = marcasDeDias(dias(n))
      expect(marcas[0]).toBe(0)
      expect(marcas.at(-1)).toBe(n - 1)
      expect(new Set(marcas).size).toBe(marcas.length)
      expect(marcas.length).toBeLessThanOrEqual(6)
    }
  })

  it('con 90 días reparte parejo', () => {
    const marcas = marcasDeDias(Array.from({ length: 90 }, (_, i) => String(i)))
    expect(marcas).toHaveLength(6)
    expect(marcas[0]).toBe(0)
    expect(marcas.at(-1)).toBe(89)
    const saltos = marcas.slice(1).map((m, i) => m - (marcas[i] ?? 0))
    expect(Math.max(...saltos) - Math.min(...saltos)).toBeLessThanOrEqual(1)
  })

  it('con un día, el primero es el último y no se repite', () => {
    expect(marcasDeDias(dias(1))).toEqual([0])
  })

  it('sin días no hay marcas', () => {
    expect(marcasDeDias([])).toEqual([])
  })
})

describe('textos de lo que se dibuja', () => {
  it('la barra de un día usa singular y plural', () => {
    expect(
      textoDeBarra('2026-11-12', [
        ['creado', 'creados', 3],
        ['convertido', 'convertidos', 1],
      ]),
    ).toBe('12/11: 3 creados, 1 convertido')
    expect(
      textoDeBarra('2026-11-02', [
        ['creada', 'creadas', 1],
        ['final', 'finales', 0],
      ]),
    ).toBe('02/11: 1 creada, 0 finales')
  })

  it('la fila de un ranking junta los dos números', () => {
    expect(
      textoDeFila([
        ['creado', 'creados', 12],
        ['convertido', 'convertidos', 5],
      ]),
    ).toBe('12 creados · 5 convertidos')
    expect(
      textoDeFila([
        ['creado', 'creados', 1],
        ['convertido', 'convertidos', 1],
      ]),
    ).toBe('1 creado · 1 convertido')
  })

  it('un nombre nulo se escribe con su frase', () => {
    expect(nombreDeOrigen(null)).toBe('Sin origen')
    expect(nombreDeOrigen('Copart')).toBe('Copart')
    expect(nombreDePersona(null)).toBe('Sin nombre')
    expect(nombreDePersona('Ana')).toBe('Ana')
  })
})

describe('notaDeTope', () => {
  it('sin «hay más» no hay nota; con él, dice cuántos se muestran y nunca un total', () => {
    expect(notaDeTope(false, TOPE_DE_ORIGENES, 'origen')).toBeNull()
    expect(notaDeTope(true, TOPE_DE_ORIGENES, 'origen')).toBe(
      'Se muestran los 10 primeros orígenes.',
    )
    expect(notaDeTope(true, TOPE_DE_PERSONAS, 'persona')).toBe(
      'Se muestran las 20 primeras personas.',
    )
  })
})
