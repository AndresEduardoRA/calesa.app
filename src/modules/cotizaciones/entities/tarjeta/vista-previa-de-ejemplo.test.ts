import { describe, expect, it } from 'vitest'
import type { LecturaParaLaVistaPrevia } from '../vista-previa-de-la-plantilla'
import { modeloDeLaTarjeta } from './modelo-de-la-tarjeta'
import {
  calculoDeEjemplo,
  PAGINA_DE_EJEMPLO,
  tarjetaDeLaVistaPrevia,
} from './vista-previa-de-ejemplo'

const fila = (nodo: string) => ({ nodo, etiqueta: nodo.toUpperCase(), leyenda: null })
const lectura: LecturaParaLaVistaPrevia = {
  logo: true,
  nota: 'Nota',
  columnas: { leyenda: false, tipoDeCambio: true, plazo: true },
  total: { etiqueta: 'Total', leyenda: null },
  grupos: [
    {
      id: 'a',
      etiqueta: 'A',
      plazo: '2 días',
      tono: null,
      tipoDeCambio: 'Oficial',
      filas: [fila('a1'), fila('a2')],
      filasDeMas: 10,
    },
    {
      id: 'b',
      etiqueta: 'B',
      plazo: null,
      tono: null,
      tipoDeCambio: null,
      filas: [fila('b1')],
      filasDeMas: 0,
    },
  ],
  aparte: [
    { nodo: 'g1', etiqueta: 'G1' },
    { nodo: 'g2', etiqueta: 'G2' },
  ],
  tonos: [],
}
const dibujar = (l: LecturaParaLaVistaPrevia) => {
  const t = tarjetaDeLaVistaPrevia(l)
  const calculo = calculoDeEjemplo(t)
  return {
    calculo,
    modelo: modeloDeLaTarjeta({ lectura: t, calculo, monedaBs: null, pagina: PAGINA_DE_EJEMPLO }),
  }
}

describe('la tarjeta de la vista previa', () => {
  it('la fila n-ésima vale (n mod 8 + 1) × 250, lo aparte 100 × (posición + 1)', () => {
    const { modelo } = dibujar(lectura)
    expect(modelo.grupos.flatMap((g) => g.filas.map((f) => f.usd))).toEqual([250, 500, 750])
    expect(modelo.aparte.map((a) => a.usd)).toEqual([100, 200])
  })

  it('el total es la suma de las filas dibujadas: no cuenta lo aparte ni lo que el tope dejó fuera', () => {
    expect(dibujar(lectura).modelo.total.usd).toBe(1500)
    const muchas = {
      ...lectura.grupos[0]!,
      filas: Array.from({ length: 9 }, (_, i) => fila(`f${i}`)),
    }
    // 250+500+…+2000 (ocho) y la novena vuelve a 250.
    expect(dibujar({ ...lectura, grupos: [muchas], aparte: [] }).modelo.total.usd).toBe(9250)
  })

  it('cada grupo es su propio bucket: el tipo de cambio de uno no pasa a otro', () => {
    const { modelo } = dibujar(lectura)
    expect(modelo.grupos.map((g) => g.tipoDeCambio)).toEqual([
      { valor: 'Oficial' },
      { valor: null },
    ])
    expect(modelo.grupos.map((g) => g.plazo)).toEqual([{ valor: '2 días' }, { valor: null }])
  })

  it('sin columna no hay celda; todas las filas están activas', () => {
    const { modelo, calculo } = dibujar({
      ...lectura,
      columnas: { leyenda: false, tipoDeCambio: false, plazo: false },
    })
    expect(modelo.grupos.every((g) => g.tipoDeCambio === null && g.plazo === null)).toBe(true)
    expect([...calculo.estados!.values()].every((e) => e === 'activo')).toBe(true)
    expect(modelo.nota).toBe('Nota')
  })
})
