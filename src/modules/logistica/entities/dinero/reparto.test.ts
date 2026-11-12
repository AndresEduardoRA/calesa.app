import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_UNIDADES_POR_REPARTO, repartirEnPartesIguales, vistaDelReparto } from './reparto'

const centavos = (partes: readonly number[]) => partes.reduce((s, p) => s + Math.round(p * 100), 0)

// Los casos de `supabase/tests/areas/dinero/prorratear.sql`: lo que se muestra antes de confirmar es lo que la base reparte.
describe('repartirEnPartesIguales', () => {
  it('100,00 entre 3 da 33,34 · 33,33 · 33,33', () => {
    expect(repartirEnPartesIguales(100, 3)).toEqual([33.34, 33.33, 33.33])
  })

  it('0,07 entre 3 da 0,03 · 0,02 · 0,02', () => {
    expect(repartirEnPartesIguales(0.07, 3)).toEqual([0.03, 0.02, 0.02])
  })

  it('0,01 entre 3 da 0,01 · 0 · 0', () => {
    expect(repartirEnPartesIguales(0.01, 3)).toEqual([0.01, 0, 0])
  })

  it('una sola unidad se lleva todo el monto', () => {
    expect(repartirEnPartesIguales(100, 1)).toEqual([100])
  })

  it('el monto 0 reparte ceros', () => {
    expect(repartirEnPartesIguales(0, 2)).toEqual([0, 0])
  })

  it('sin unidades, o con un monto que no es válido, no reparte nada', () => {
    expect(repartirEnPartesIguales(100, 0)).toEqual([])
    expect(repartirEnPartesIguales(100, -2)).toEqual([])
    expect(repartirEnPartesIguales(-1, 3)).toEqual([])
    expect(repartirEnPartesIguales(Number.NaN, 3)).toEqual([])
    expect(repartirEnPartesIguales(Number.POSITIVE_INFINITY, 3)).toEqual([])
  })

  it('para cualquier monto y cualquier número de unidades la suma es exacta y las partes difieren como mucho en un centavo', () => {
    for (let c = 1; c <= 100_000; c += 37) {
      const monto = c / 100
      for (let n = 1; n <= 12; n++) {
        const partes = repartirEnPartesIguales(monto, n)
        expect(partes).toHaveLength(n)
        expect(centavos(partes)).toBe(c)
        const cs = partes.map((p) => Math.round(p * 100))
        expect(Math.max(...cs) - Math.min(...cs)).toBeLessThanOrEqual(1)
        expect(cs).toEqual([...cs].sort((a, b) => b - a))
      }
    }
  })
})

describe('vistaDelReparto', () => {
  const unidades = [
    { id: 'u1', titulo: 'Toyota Hilux' },
    { id: 'u2', titulo: 'Nissan Frontier' },
    { id: 'u3', titulo: 'Suzuki Jimny' },
  ]

  it('conserva el orden de las unidades, que es el que se manda a la base', () => {
    const vista = vistaDelReparto(unidades, 100)
    expect(vista.exceso).toBe(false)
    expect(vista.filas.map((f) => f.unidadId)).toEqual(['u1', 'u2', 'u3'])
    expect(vista.filas.map((f) => f.parte)).toEqual([33.34, 33.33, 33.33])
    expect(vista.filas.map((f) => f.titulo)).toEqual([
      'Toyota Hilux',
      'Nissan Frontier',
      'Suzuki Jimny',
    ])
  })

  it('la suma es exactamente el monto tipeado', () => {
    expect(vistaDelReparto(unidades, 100).suma).toBe(100)
    expect(vistaDelReparto(unidades, 0.07).suma).toBe(0.07)
  })

  it('con 200 unidades reparte y con 201 marca el exceso sin ninguna fila', () => {
    const muchas = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `u${i}`, titulo: `Unidad ${i}` }))
    expect(MAXIMO_DE_UNIDADES_POR_REPARTO).toBe(200)
    expect(vistaDelReparto(muchas(200), 100).filas).toHaveLength(200)
    const exceso = vistaDelReparto(muchas(201), 100)
    expect(exceso.exceso).toBe(true)
    expect(exceso.filas).toEqual([])
  })

  it('sin unidades no hay filas ni suma', () => {
    expect(vistaDelReparto([], 100)).toEqual({ filas: [], suma: 0, exceso: false })
  })
})
