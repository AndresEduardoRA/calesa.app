import { describe, expect, it } from 'vitest'
import { evaluar } from './motor'
import { esquemaEntrada } from './motor-entrada'
import { evaluacionSintetica, type OpcionesDeEvaluacionSintetica } from './evaluacion-sintetica'
import { validarFormula } from './validar'

function evaluarSintetica(n: number, opciones?: OpcionesDeEvaluacionSintetica) {
  const s = evaluacionSintetica(n, opciones)
  const f = validarFormula(s.definicion, s.params)
  if (!f.ok) throw new Error(f.error.mensaje)
  return { s, resultado: evaluar(f.formula, esquemaEntrada.parse(s.entrada)) }
}

describe('evaluacionSintetica', () => {
  it('tiene los nodos que se piden, valida y evalúa sin faltantes', () => {
    for (const n of [200, 2000]) {
      const { s, resultado } = evaluarSintetica(n)
      expect(s.definicion.nodos).toHaveLength(n)
      expect(resultado.faltantes).toEqual([])
      expect(Object.keys(resultado.valores)).toHaveLength(n)
    }
  })

  it('con tablas congeladas o vivas da lo mismo', () => {
    const congeladas = evaluarSintetica(200, { filas: 100, tablas: 4 })
    const vivas = evaluarSintetica(200, { filas: 100, tablas: 4, vivas: true })
    expect(Object.keys(congeladas.s.params)).toContain('tablas')
    expect(Object.keys(vivas.s.params)).not.toContain('tablas')
    expect(Object.keys(vivas.s.entrada.tablas)).toEqual(['t1', 't2', 't3', 't4'])
    expect(vivas.resultado).toEqual(congeladas.resultado)
  })

  it('busca siempre la última fila de cada tabla', () => {
    const { s } = evaluarSintetica(200, { filas: 1000, tablas: 4, vivas: true })
    expect(s.entrada.vehiculo).toEqual({ anio: 2999, clase: 'c999' })
    for (const filas of Object.values(s.entrada.tablas)) expect(filas).toHaveLength(1000)
  })

  it('con un año inicial, las tablas por año y el vehículo se corren juntos y busca la misma última fila', () => {
    const base = evaluarSintetica(200, { filas: 1000, tablas: 4, vivas: true })
    const corrida = evaluarSintetica(200, {
      filas: 1000,
      tablas: 4,
      vivas: true,
      anioInicial: 1100,
    })
    expect(corrida.s.entrada.vehiculo).toEqual({ anio: 2099, clase: 'c999' })
    expect(corrida.s.entrada.tablas['t2']?.[0]).toEqual({ desde: 1100, hasta: 1100, v: 0 })
    expect(corrida.resultado.faltantes).toEqual([])
    // El año sólo es la clave del tramo: lo único que cambia es el valor del propio nodo `anio`.
    expect({ ...corrida.resultado.valores, anio: 0 }).toEqual({
      ...base.resultado.valores,
      anio: 0,
    })
    expect(corrida.resultado.valores['anio']).toBe(2099)
    // Sin la opción, es el año 2000 de siempre.
    expect(
      evaluacionSintetica(200, { filas: 1000, tablas: 4, vivas: true, anioInicial: 2000 }),
    ).toEqual(evaluacionSintetica(200, { filas: 1000, tablas: 4, vivas: true }))
  })

  it('las tablas van de a pares', () => {
    expect(() => evaluacionSintetica(200, { tablas: 3 })).toThrow()
    expect(() => evaluacionSintetica(200, { tablas: 0 })).toThrow()
  })
})
