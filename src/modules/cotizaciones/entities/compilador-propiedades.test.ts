import { describe, expect, it } from 'vitest'
import { compilarExpresion } from './compilador'
import { formulaDe } from './compilador-formula-de-prueba'
import {
  azarCon,
  casoAlAzar,
  CONTEXTO,
  imprimir,
  oraculo,
  type Caso,
  type Expr,
} from './compilador-generador'
import { evaluar } from './motor'
import { esquemaEntrada } from './motor-entrada'
import { validarFormula } from './validar'

const SEMILLA = 20261025

function calcular(
  texto: string,
  inputs: Record<string, number>,
  banderas: Record<string, boolean>,
) {
  const r = compilarExpresion(texto, CONTEXTO)
  if (!r.ok)
    throw new Error(`«${texto}» no compiló: ${r.error.mensaje} (${JSON.stringify(r.error.tramo)})`)
  const f = formulaDe(CONTEXTO, r)
  const v = validarFormula(f.definicion, f.params)
  if (!v.ok) throw new Error(`«${texto}» compiló a un grafo que no valida: ${v.error.mensaje}`)
  const entrada = esquemaEntrada.parse({
    inputs,
    banderas,
    tipos_cambio: { paralelo: 1 },
    vehiculo: {},
    tablas: {},
    overrides: {},
  })
  return { nodos: r.nodos, valor: evaluar(v.formula, entrada).valores['total'] }
}

// Igual hasta el último bit (y null contra null).
const mismoBit = (a: unknown, b: number | null) => a === b && Object.is(a, b)

describe('el compilador contra el cálculo directo en JS', () => {
  it('2.500 expresiones al azar con semilla fija: compilan, validan y dan lo mismo bit a bit que el oráculo', () => {
    const azar = azarCon(SEMILLA)
    const malos: string[] = []
    for (let i = 0; i < 2500; i += 1) {
      const c: Caso = casoAlAzar(azar)
      const esperado = oraculo(c.expr, c.inputs, c.banderas)
      const { valor } = calcular(c.texto, c.inputs, c.banderas)
      if (!mismoBit(valor, esperado))
        malos.push(`${JSON.stringify(c.texto)}: ${String(valor)} contra ${String(esperado)}`)
    }
    expect(malos.slice(0, 5)).toEqual([])
  })

  it('el mismo texto se vuelve a escribir igual: el generador es determinista', () => {
    const a = casoAlAzar(azarCon(SEMILLA))
    const b = casoAlAzar(azarCon(SEMILLA))
    expect(b).toEqual(a)
  })

  it('dos formas de escribir lo mismo (con paréntesis de más) dan el mismo valor', () => {
    const azar = azarCon(SEMILLA + 1)
    for (let i = 0; i < 300; i += 1) {
      const c = casoAlAzar(azar)
      const otra = imprimir(c.expr, azarCon(i))
      const [a, b] = [calcular(c.texto, c.inputs, c.banderas), calcular(otra, c.inputs, c.banderas)]
      expect(b.valor, otra).toBe(a.valor)
    }
  })
})

const sin = {}
const calc = (texto: string) => calcular(texto, { x0: 0.1, x1: 0.2, x2: 0.3 }, sin)

describe('la aritmética de dobles, escrita a mano', () => {
  it('0.1+0.2+0.3 es un solo suma, de izquierda a derecha: 0,6000000000000001', () => {
    const r = calc('x0+x1+x2')
    expect(r.nodos.map((n) => n.id)).toEqual(['total'])
    expect(r.valor).toBe(0.6000000000000001)
  })

  it('al revés, 0.3+0.2+0.1 es 0,6', () => {
    expect(calc('x2+x1+x0').valor).toBe(0.6)
  })

  it('a+(b+c) no se aplana: 0,1 + 0,5 es 0,6 y son dos sumas', () => {
    const r = calc('x0+(x1+x2)')
    expect(r.nodos.map((n) => n.id)).toEqual(['total__1', 'total'])
    expect(r.valor).toBe(0.6)
  })

  it('con literales: 0.1+0.2+0.3 y su orden contrario', () => {
    expect(calc('0.1+0.2+0.3').valor).toBe(0.6000000000000001)
    expect(calc('0.3+0.2+0.1').valor).toBe(0.6)
    expect(calc('0.1+(0.2+0.3)').valor).toBe(0.6)
  })

  it('a-b-c es (a-b)-c y no a-(b+c)', () => {
    expect(calc('x0-x1-x2').valor).toBe(0.1 - 0.2 - 0.3)
    expect(calc('x0-(x1-x2)').valor).toBe(0.1 - (0.2 - 0.3))
  })

  it('a/b/c es (a/b)/c', () => {
    expect(calc('x0/x1/x2').valor).toBe(0.1 / 0.2 / 0.3)
  })

  it('la precedencia es la usual', () => {
    expect(calc('x0+x1*x2').valor).toBe(0.1 + 0.2 * 0.3)
    expect(calc('x0*x1+x2').valor).toBe(0.1 * 0.2 + 0.3)
    expect(calc('x0-x1/x2').valor).toBe(0.1 - 0.2 / 0.3)
  })

  it('±0: 0*-1 vale 0, no −0', () => {
    expect(Object.is(calc('0*-1').valor, 0)).toBe(true)
    expect(Object.is(calc('-0').valor, 0)).toBe(true)
    expect(Object.is(calc('0/1*-1').valor, 0)).toBe(true)
  })

  it('∞: lo que no cabe en un doble es null, y null se propaga (JS daría 0 en 1/∞)', () => {
    expect(calc('1e308*10').valor).toBeNull()
    expect(calc('1/(1e308*10)').valor).toBeNull()
    expect(calc('1e308+1e308-1e308').valor).toBeNull()
    expect(calc('1/(0*-1)').valor).toBeNull()
  })

  it('1e-300: sobrevive solo y se pierde al multiplicarse por sí mismo', () => {
    expect(calc('1e-300').valor).toBe(1e-300)
    expect(calc('1e-300*1e-300').valor).toBe(0)
    expect(Object.is(calc('1e-300*-1e-300').valor, 0)).toBe(true)
  })

  it('un porcentaje corre el punto en el texto: 0.1% es 0.001 y 12.5% es 0.125', () => {
    expect(calc('0.1%').valor).toBe(0.001)
    expect(calc('12.5%').valor).toBe(0.125)
    expect(calc('7%').valor).toBe(0.07)
    expect(calc('1e2%').valor).toBe(1)
    expect(calc('3%+0.1%').valor).toBe(0.03 + 0.001)
  })
})

describe('un texto adversario nunca lanza', () => {
  const ALFABETO = '0123456789.eE+-*/()%;, =xyzabSUMAIHOYR_$@#\n\tñ😀:! '
  it('6.000 cadenas al azar: o compilan o dan un error con un tramo dentro del texto', () => {
    const azar = azarCon(SEMILLA + 2)
    const alfabeto = Array.from(ALFABETO)
    for (let i = 0; i < 6000; i += 1) {
      const largo = azar.entero(40)
      const texto = Array.from(
        { length: largo },
        () => alfabeto[azar.entero(alfabeto.length)],
      ).join('')
      const r = compilarExpresion(texto, CONTEXTO)
      if (r.ok) {
        expect(r.nodos.at(-1)?.id, texto).toBe('total')
        continue
      }
      const { desde, largo: l, linea, columna } = r.error.tramo
      expect(desde, texto).toBeGreaterThanOrEqual(0)
      expect(l, texto).toBeGreaterThanOrEqual(0)
      expect(desde + l, texto).toBeLessThanOrEqual(texto.length)
      expect([linea >= 1, columna >= 1], texto).toEqual([true, true])
      expect(r.error.mensaje.length, texto).toBeGreaterThan(0)
    }
  })

  it('1.500 textos válidos con un carácter cambiado, borrado o metido: nunca una excepción', () => {
    const azar = azarCon(SEMILLA + 3)
    const ruido = Array.from('()+-*/%;,.e 0x$#')
    for (let i = 0; i < 1500; i += 1) {
      const e: Expr = casoAlAzar(azar).expr
      const base = imprimir(e, azar)
      const k = azar.entero(base.length + 1)
      const c = ruido[azar.entero(ruido.length)] ?? ''
      const texto =
        [
          base.slice(0, k) + c + base.slice(k),
          base.slice(0, k) + base.slice(k + 1),
          base.slice(0, k) + c + base.slice(k + 1),
        ][i % 3] ?? base
      expect(() => compilarExpresion(texto, CONTEXTO), texto).not.toThrow()
    }
  })
})
