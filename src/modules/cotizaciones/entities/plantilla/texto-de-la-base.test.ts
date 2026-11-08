import { describe, expect, it } from 'vitest'
import {
  mensajeDeTextoDeLaBase,
  PROFUNDIDAD_MAXIMA,
  revisarTextoParaLaBase,
} from './texto-de-la-base'

const ALTO = '\uD83D'
const BAJO = '\uDE00'
const EMOJI = '😀'

// n arreglos metidos uno en otro; el más hondo lleva `hoja`. Se arma con un bucle: el valor no se recorre con recursión.
function anidado(n: number, hoja: unknown = 'x'): unknown {
  let v: unknown = hoja
  for (let i = 0; i < n; i++) v = [v]
  return v
}

describe('revisarTextoParaLaBase: lo que pasa', () => {
  it('un emoji bien formado, un acento, vacío, números, booleanos y nulos pasan', () => {
    for (const v of [EMOJI, 'áéíóú ñ «x»', '', 3, true, null, [EMOJI, 1.5], { a: { b: [null] } }]) {
      expect(revisarTextoParaLaBase(v)).toBeNull()
    }
  })

  it('`undefined` es una clave ausente, como lo deja JSON.stringify', () => {
    expect(revisarTextoParaLaBase({ a: undefined, b: [undefined] })).toBeNull()
    expect(revisarTextoParaLaBase(undefined)).toBeNull()
  })

  it('una clave con emoji pasa', () => {
    expect(revisarTextoParaLaBase({ [EMOJI]: 'x' })).toBeNull()
  })
})

describe('revisarTextoParaLaBase: el carácter que la base no lee', () => {
  it('un `\\u0000` y un surrogate alto o bajo sueltos en una cadena: la raíz es «definicion»', () => {
    expect(revisarTextoParaLaBase('a\u0000b')).toEqual({ donde: 'definicion', motivo: 'nulo' })
    expect(revisarTextoParaLaBase(`a${ALTO}b`)).toEqual({
      donde: 'definicion',
      motivo: 'surrogate',
    })
    expect(revisarTextoParaLaBase(`a${BAJO}b`)).toEqual({
      donde: 'definicion',
      motivo: 'surrogate',
    })
    expect(revisarTextoParaLaBase(ALTO)).toEqual({ donde: 'definicion', motivo: 'surrogate' })
    expect(revisarTextoParaLaBase(`${BAJO}${ALTO}`)).toEqual({
      donde: 'definicion',
      motivo: 'surrogate',
    })
  })

  it('en un valor de objeto, con la ruta de la base', () => {
    expect(revisarTextoParaLaBase({ etiquetas: { flete: `x${ALTO}` } })).toEqual({
      donde: 'etiquetas.flete',
      motivo: 'surrogate',
    })
  })

  it('en un arreglo, con su índice', () => {
    expect(
      revisarTextoParaLaBase({ grupos: [{ grupo: 'a' }, { grupo: 'b' }, { tono: 'x\u0000' }] }),
    ).toEqual({
      donde: 'grupos[2].tono',
      motivo: 'nulo',
    })
  })

  it('en una clave: la ruta es la del objeto que la tiene, sin el texto malo', () => {
    const r1 = revisarTextoParaLaBase({ etiquetas: { [`a${ALTO}`]: 'x' } })
    expect(r1).toEqual({ donde: 'etiquetas', motivo: 'surrogate' })
    const r2 = revisarTextoParaLaBase({ 'a\u0000': 'x' })
    expect(r2).toEqual({ donde: 'definicion', motivo: 'nulo' })
  })

  it('a 5 niveles', () => {
    expect(revisarTextoParaLaBase(anidado(5, 'a\u0000'))).toEqual({
      donde: '[0][0][0][0][0]',
      motivo: 'nulo',
    })
  })

  it('manda el primero en orden', () => {
    expect(revisarTextoParaLaBase({ a: 'x\u0000', b: ALTO })).toEqual({
      donde: 'a',
      motivo: 'nulo',
    })
    expect(revisarTextoParaLaBase([ALTO, 'x\u0000'])).toEqual({ donde: '[0]', motivo: 'surrogate' })
  })
})

describe('revisarTextoParaLaBase: lo que no es JSON y lo demasiado hondo', () => {
  it('un bigint, una función, un símbolo y un número que no es finito son «no_json»', () => {
    for (const v of [10n, () => 1, Symbol('x'), NaN, Infinity, -Infinity]) {
      expect(revisarTextoParaLaBase(v)).toEqual({ donde: 'definicion', motivo: 'no_json' })
    }
    expect(revisarTextoParaLaBase({ total: { etiqueta: 10n } })).toEqual({
      donde: 'total.etiqueta',
      motivo: 'no_json',
    })
  })

  it('8 niveles pasan y 9 no', () => {
    expect(PROFUNDIDAD_MAXIMA).toBe(8)
    expect(revisarTextoParaLaBase(anidado(8))).toBeNull()
    expect(revisarTextoParaLaBase(anidado(9))).toEqual({
      donde: '[0][0][0][0][0][0][0][0]',
      motivo: 'profundo',
    })
  })

  it('100.000 niveles dan «profundo» sin lanzar, de arreglos y de objetos', () => {
    expect(revisarTextoParaLaBase(anidado(100_000))?.motivo).toBe('profundo')
    let o: unknown = 'x'
    for (let i = 0; i < 100_000; i++) o = { a: o }
    expect(revisarTextoParaLaBase(o)?.motivo).toBe('profundo')
  })

  it('un ciclo da «profundo» y no se queda dando vueltas', () => {
    const ciclo: Record<string, unknown> = {}
    ciclo['yo'] = ciclo
    expect(revisarTextoParaLaBase(ciclo)?.motivo).toBe('profundo')
  })

  it('un arreglo ancho se recorre entero', () => {
    const ancho = Array.from({ length: 50_000 }, () => 'x')
    ancho.push('\u0000')
    expect(revisarTextoParaLaBase(ancho)).toEqual({ donde: '[50000]', motivo: 'nulo' })
  })
})

describe('mensajeDeTextoDeLaBase', () => {
  it('dice dónde y nunca repite el texto malo', () => {
    expect(mensajeDeTextoDeLaBase({ donde: 'grupos[2].tono', motivo: 'nulo' })).toBe(
      'Hay un carácter que no se puede guardar en «grupos[2].tono».',
    )
    expect(mensajeDeTextoDeLaBase({ donde: 'total', motivo: 'no_json' })).toBe(
      'Hay un valor que no se puede guardar en «total».',
    )
    expect(mensajeDeTextoDeLaBase({ donde: 'definicion', motivo: 'profundo' })).toBe(
      'Hay un valor demasiado anidado en «definicion».',
    )
  })
})
