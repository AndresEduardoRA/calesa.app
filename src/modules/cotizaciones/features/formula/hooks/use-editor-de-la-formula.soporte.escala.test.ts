import { describe, expect, it } from 'vitest'
import { formulaDeNFilas } from '../../../entities/formula/fila-de-prueba.soporte'
import { filasParaDibujar, filasVisibles } from './use-editor-de-la-formula.soporte'

// Las filas para dibujar compilan cada fila contra la fórmula entera (`textoVigente()` y `textoDeNodo()` recorren todos los nodos): O(filas × nodos), una vez por
// fórmula de trabajo. Esto cae si una fila pasa a costar más (p. ej. recorrer la fórmula por cada nodo de la fila) o si el medidor deja de pasarse.
const visitas = (n: number) => {
  const m = { visitas: 0 }
  const filas = filasParaDibujar(formulaDeNFilas(n), m)
  return { v: m.visitas, filas, m }
}

describe('filasParaDibujar con volumen (T5)', () => {
  it('600 y 2.000 filas: cuadrático acotado, con la constante de 600 + 10 %', () => {
    const chica = visitas(600)
    const grande = visitas(2000)
    expect(grande.v).toBeGreaterThan(2000 * 2000)
    expect(grande.v / 2000 ** 2).toBeLessThanOrEqual(1.1 * (chica.v / 600 ** 2))
    // Filtrar la lista ya calculada no vuelve a compilar.
    const antes = grande.m.visitas
    expect(filasVisibles(grande.filas, 'r1999', null).filas.map((f) => f.id)).toEqual(['r1999'])
    expect(grande.m.visitas).toBe(antes)
  }, 30_000)
})
