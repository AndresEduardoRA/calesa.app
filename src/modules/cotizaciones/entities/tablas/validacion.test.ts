import { describe, expect, it } from 'vitest'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import {
  columnasDesde,
  esquemaDeFilaDeTabla,
  MENSAJE_DEL_TOPE,
  motivoDeCelda,
  TOPE_DE_FILAS,
  validarFilas,
} from './validacion'

const variante: ColumnaDeTabla = { clave: 'variante', etiqueta: 'Variante', tipo: 'texto' }
const columnas: ColumnaDeTabla[] = [
  { clave: 'monto', etiqueta: 'Monto', tipo: 'numero' },
  { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
  variante,
  { clave: 'libre', etiqueta: 'Libre', tipo: '' },
]

describe('validarFilas: los mensajes y caminos de la base (supabase/tests/areas/tablas/publicar.sql)', () => {
  it('lo que no es una lista', () => {
    expect(validarFilas(columnas, { a: 1 })).toEqual({
      mensaje: 'Las filas de la tabla van en una lista.',
      camino: 'filas',
    })
  })

  it('una clave que no es columna', () => {
    expect(validarFilas(columnas, [{ otra: 1 }])).toEqual({
      mensaje: 'La fila 1: la tabla no tiene la columna «otra».',
      camino: 'filas.0.otra',
    })
  })

  it('un texto en una columna de número', () => {
    expect(validarFilas(columnas, [{ monto: 1 }, { monto: 'x' }])).toEqual({
      mensaje: 'La fila 2: «Monto» va con un número.',
      camino: 'filas.1.monto',
    })
  })

  it('un número en una columna de texto', () => {
    expect(validarFilas(columnas, [{ variante: 3 }])).toEqual({
      mensaje: 'La fila 1: «Variante» va con un texto de hasta 200 letras.',
      camino: 'filas.0.variante',
    })
  })

  it('una fila que no es un objeto', () => {
    for (const fila of [null, [1], 3, 'x']) {
      expect(validarFilas(columnas, [fila])).toEqual({
        mensaje: 'La fila 1: no es una fila de la tabla.',
        camino: 'filas.0',
      })
    }
  })

  it('2.000 filas pasan y 2.001 dan el tope', () => {
    const filas = Array.from({ length: TOPE_DE_FILAS }, (_, n) => ({ monto: n }))
    expect(validarFilas(columnas, filas)).toBeNull()
    expect(validarFilas(columnas, [...filas, { monto: 1 }])).toEqual({
      mensaje: MENSAJE_DEL_TOPE,
      camino: 'filas',
    })
  })
})

describe('validarFilas: el orden y los bordes', () => {
  it('la primera fila que falla gana sobre las siguientes', () => {
    expect(validarFilas(columnas, [{ monto: 1 }, { otra: 1 }, { monto: 'x' }])?.camino).toBe(
      'filas.1.otra',
    )
  })

  it('las claves van por punto de código, no por localeCompare: «B» antes que «a»', () => {
    const conB: ColumnaDeTabla[] = [...columnas, { clave: 'B', etiqueta: 'Be', tipo: 'numero' }]
    expect(validarFilas(conB, [{ a: 1, B: 'x' }])).toEqual({
      mensaje: 'La fila 1: «Be» va con un número.',
      camino: 'filas.0.B',
    })
  })

  it('una clave fuera del BMP va después de una U+E000–U+FFFF (el < de JS diría lo contrario)', () => {
    const alta = '\u{1F600}'
    const privada = ''
    expect(validarFilas(columnas, [{ [alta]: 1, [privada]: 1 }])?.camino).toBe(`filas.0.${privada}`)
  })
})

describe('motivoDeCelda: cada tipo', () => {
  it('un año entero vale y uno con decimales no', () => {
    expect(validarFilas(columnas, [{ anio: 2024 }])).toBeNull()
    expect(validarFilas(columnas, [{ anio: 2024.5 }])).toEqual({
      mensaje: 'La fila 1: «Año» va con un año.',
      camino: 'filas.0.anio',
    })
  })

  it('el largo se cuenta en puntos de código: 150 emojis valen y 201 letras no', () => {
    expect(validarFilas(columnas, [{ variante: '\u{1F600}'.repeat(150) }])).toBeNull()
    expect(validarFilas(columnas, [{ variante: 'a'.repeat(200) }])).toBeNull()
    expect(validarFilas(columnas, [{ variante: 'a'.repeat(201) }])?.camino).toBe('filas.0.variante')
  })

  it('un texto con \\u0000 o con un surrogate suelto no vale', () => {
    expect(motivoDeCelda(variante, 'a\u0000b')).not.toBeNull()
    expect(motivoDeCelda(variante, 'a\uD800b')).not.toBeNull()
  })

  it('un booleano, un objeto o una lista no valen en ningún tipo', () => {
    for (const columna of columnas) {
      for (const malo of [true, {}, [1]]) {
        expect(motivoDeCelda(columna, malo)).not.toBeNull()
      }
    }
  })

  it('un tipo desconocido acepta número y texto, con su propio motivo', () => {
    expect(validarFilas(columnas, [{ libre: 3 }, { libre: 'x' }])).toBeNull()
    expect(validarFilas(columnas, [{ libre: true }])?.mensaje).toBe(
      'La fila 1: «Libre» va con un número o un texto de hasta 200 letras.',
    )
  })

  it('una etiqueta de espacios cae a la clave; una con tabulador no se recorta', () => {
    const raras: ColumnaDeTabla[] = [
      { clave: 'a', etiqueta: '   ', tipo: 'numero' },
      { clave: 'b', etiqueta: '\tBe', tipo: 'numero' },
    ]
    expect(validarFilas(raras, [{ a: 'x' }])?.mensaje).toBe('La fila 1: «a» va con un número.')
    expect(validarFilas(raras, [{ b: 'x' }])?.mensaje).toBe('La fila 1: «\tBe» va con un número.')
  })

  it('una celda nula o ausente vale en todos los tipos', () => {
    for (const columna of columnas) {
      expect(motivoDeCelda(columna, null)).toBeNull()
      expect(motivoDeCelda(columna, undefined)).toBeNull()
    }
  })

  it('con dos columnas de la misma clave manda la primera', () => {
    const dobles: ColumnaDeTabla[] = [
      { clave: 'a', etiqueta: 'Primera', tipo: 'texto' },
      { clave: 'a', etiqueta: 'Segunda', tipo: 'numero' },
    ]
    expect(validarFilas(dobles, [{ a: 'x' }])).toBeNull()
  })
})

describe('esquemaDeFilaDeTabla', () => {
  it('un issue por celda que no vale y por clave ajena, con su clave como camino', () => {
    const leida = esquemaDeFilaDeTabla(columnas).safeParse({ monto: 'x', otra: 1, anio: 2020 })
    expect(leida.success).toBe(false)
    expect(leida.error?.issues.map((i) => [i.path, i.message])).toEqual([
      [['monto'], '«Monto» va con un número.'],
      [['otra'], 'La tabla no tiene la columna «otra».'],
    ])
    expect(esquemaDeFilaDeTabla(columnas).safeParse({ monto: 1, anio: null }).success).toBe(true)
  })
})

describe('columnasDesde', () => {
  it('lee las columnas de la base; etiqueta y tipo que faltan quedan vacíos', () => {
    expect(columnasDesde([{ clave: 'a', etiqueta: 'A', tipo: 'numero' }, { clave: 'b' }])).toEqual([
      { clave: 'a', etiqueta: 'A', tipo: 'numero' },
      { clave: 'b', etiqueta: '', tipo: '' },
    ])
  })

  it('otra forma da null', () => {
    expect(columnasDesde(null)).toBeNull()
    expect(columnasDesde([{ etiqueta: 'A' }])).toBeNull()
    expect(columnasDesde([1])).toBeNull()
  })
})
