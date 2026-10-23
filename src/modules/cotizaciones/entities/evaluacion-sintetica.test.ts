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

  it('las tablas van de a pares', () => {
    expect(() => evaluacionSintetica(200, { tablas: 3 })).toThrow()
    expect(() => evaluacionSintetica(200, { tablas: 0 })).toThrow()
  })
})
