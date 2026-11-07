import { describe, expect, it } from 'vitest'
import { compilarExpresion } from '../compilador'
import { azarCon, LITERALES } from '../compilador-generador'
import { escribirLiteral } from './literal'

const contexto = {
  nodos: [],
  grupos: [],
  params: {},
  destino: { id: 'fila', etiqueta: 'Fila' },
}
// El valor que el compilador lee de un literal escrito como texto (la raíz es el número solo).
function leer(texto: string): number | undefined {
  const r = compilarExpresion(`=${texto}`, contexto)
  return r.ok ? r.params['fila'] : undefined
}
// Escribir y leer da el mismo doble; con % y un valor cuyo texto desborda (más de 1e306), no se escribe (nulo).
function ida(v: number, pct: boolean): boolean {
  const t = escribirLiteral(v, pct)
  if (t === null) return pct && !Number.isFinite(Number(`${String(v)}e2`))
  return Object.is(leer(t), v)
}

describe('escribirLiteral (T7, C8)', () => {
  it('no escribe un negativo ni un valor que no es finito', () => {
    for (const v of [
      -3,
      -0.5,
      -1e-300,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(escribirLiteral(v, false), String(v)).toBeNull()
      expect(escribirLiteral(v, true), String(v)).toBeNull()
    }
  })

  it('un porcentaje corre el punto en el texto', () => {
    expect(escribirLiteral(0.05, true)).toBe('5%')
    expect(escribirLiteral(0.125, true)).toBe('12.5%')
    expect(escribirLiteral(0.001, true)).toBe('0.1%')
    expect(escribirLiteral(0, true)).toBe('0%')
    expect(escribirLiteral(5, true)).toBe('500%')
    expect(escribirLiteral(0.05, false)).toBe('0.05')
  })

  it('los literales del generador vuelven a su doble, con y sin %', () => {
    for (const l of LITERALES.filter((x) => x.valor >= 0)) {
      expect(ida(l.valor, false), l.texto).toBe(true)
      expect(ida(l.valor, true), l.texto).toBe(true)
    }
  })

  it('propiedad: 10.000 dobles al azar (por bits) vuelven al mismo doble', () => {
    const azar = azarCon(421)
    const buffer = new DataView(new ArrayBuffer(8))
    let probados = 0
    while (probados < 10_000) {
      buffer.setUint32(0, azar.entero(2 ** 32 - 1))
      buffer.setUint32(4, azar.entero(2 ** 32 - 1))
      const v = Math.abs(buffer.getFloat64(0))
      if (!Number.isFinite(v)) continue
      probados += 1
      for (const pct of [false, true]) expect(ida(v, pct), String(v)).toBe(true)
    }
  })

  it('un porcentaje que desborda al escribirse no se escribe; sin % sí', () => {
    expect(escribirLiteral(1e307, true)).toBeNull()
    expect(escribirLiteral(1e307, false)).toBe('1e+307')
    expect(escribirLiteral(1e306, true)).toBe('1e308%')
  })

  it('el cero y los extremos', () => {
    for (const v of [0, Number.MIN_VALUE, Number.MAX_VALUE, 1e21, 1e-7, 123456789.123456789]) {
      for (const pct of [false, true]) expect(ida(v, pct), `${String(v)} ${String(pct)}`).toBe(true)
    }
  })
})
