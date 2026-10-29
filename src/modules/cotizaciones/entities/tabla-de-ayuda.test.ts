import { describe, expect, it } from 'vitest'
import {
  argumentosDeTabla,
  celdaDeTabla,
  columnasDeLaTabla,
  resultadoDeTabla,
  tablaDesde,
  type TablaDeAyuda,
} from './tabla-de-ayuda'

const LECTURA = {
  clave: 'transporte',
  nombre: 'Transporte',
  columnas: [
    { clave: 'tipo', etiqueta: 'Tipo de vehículo', tipo: 'texto' },
    { clave: 'cliente', etiqueta: 'Cliente', tipo: 'numero' },
  ],
  filas: [{ tipo: 'sedan', cliente: 1200.5, oficina: 900 }, 'no soy una fila', null],
  hay_mas: false,
  congelada: true,
}

const tabla = (mas: Partial<TablaDeAyuda> = {}): TablaDeAyuda => ({
  clave: 't',
  nombre: 'T',
  columnas: [],
  filas: [],
  hayMas: false,
  ...mas,
})

describe('argumentosDeTabla', () => {
  it('manda la tabla, el origen y la hoja abierta, y nunca una cotización', () => {
    expect(argumentosDeTabla({ tabla: 't', origenId: 'o', abierta: 'ab' })).toEqual({
      p_tabla: 't',
      p_origen: 'o',
      p_abierta: 'ab',
    })
  })
})

describe('tablaDesde', () => {
  it('lee lo que nombra, deja caer lo demás y cuenta como vacía una fila que no es objeto', () => {
    const leida = tablaDesde(LECTURA)
    expect(leida).toEqual({
      clave: 'transporte',
      nombre: 'Transporte',
      columnas: LECTURA.columnas,
      filas: [{ tipo: 'sedan', cliente: 1200.5, oficina: 900 }, {}, {}],
      hayMas: false,
    })
    expect(leida).not.toHaveProperty('congelada')
  })

  it('lleva hay_mas', () => {
    expect(tablaDesde({ ...LECTURA, hay_mas: true })?.hayMas).toBe(true)
  })

  it('una respuesta que no cumple es nula', () => {
    expect(tablaDesde(null)).toBeNull()
    expect(tablaDesde({ ...LECTURA, hay_mas: 'sí' })).toBeNull()
    expect(tablaDesde({ ...LECTURA, filas: {} })).toBeNull()
    expect(tablaDesde({ ...LECTURA, columnas: [{ clave: 'x' }] })).toBeNull()
  })
})

describe('resultadoDeTabla', () => {
  it('devuelve la tabla leída', () => {
    const r = resultadoDeTabla({ data: LECTURA, error: null })
    expect(r.ok && r.data.clave).toBe('transporte')
  })

  it('un error de la base va por su código (la pantalla decide su texto con él, no con el mensaje)', () => {
    const r = resultadoDeTabla({
      data: null,
      error: { code: '42501', message: 'No tienes acceso a esa tabla.' },
    })
    expect(!r.ok && r.error.codigo).toBe('sin_permiso')
    const abierta = resultadoDeTabla({
      data: null,
      error: { code: '22023', message: 'abierta_invalida' },
    })
    expect(!abierta.ok && abierta.error.codigo).toBe('regla')
  })

  it('una respuesta ilegible es «inesperado»', () => {
    const r = resultadoDeTabla({ data: { clave: 1 }, error: null })
    expect(!r.ok && r.error.codigo).toBe('inesperado')
  })
})

describe('columnasDeLaTabla', () => {
  it('dibuja sólo las declaradas, en su orden, aunque las filas traigan una clave de más', () => {
    const leida = tablaDesde(LECTURA)
    expect(leida && columnasDeLaTabla(leida).map((c) => c.clave)).toEqual(['tipo', 'cliente'])
  })

  it('sin columnas declaradas, las claves de la primera fila, en su orden, con la clave de encabezado y como texto (no se sabe si un número es dinero)', () => {
    const t = tabla({ filas: [{ desde: 2018, nota: 'x' }, { otra: 1 }] })
    expect(columnasDeLaTabla(t)).toEqual([
      { clave: 'desde', etiqueta: 'desde', tipo: 'texto' },
      { clave: 'nota', etiqueta: 'nota', tipo: 'texto' },
    ])
  })

  it('sin columnas ni filas, nada', () => {
    expect(columnasDeLaTabla(tabla())).toEqual([])
  })
})

describe('celdaDeTabla', () => {
  it('un numero: hasta 6 decimales, sin ceros de relleno, con separador de miles y es una cifra', () => {
    expect(celdaDeTabla(9191.5, 'numero', 'es-BO')).toEqual({
      tipo: 'cifra',
      valor: 9191.5,
      texto: '9.191,5',
    })
    expect(celdaDeTabla(0.123456789, 'numero', 'es-BO')).toMatchObject({ texto: '0,123457' })
    expect(celdaDeTabla(1000, 'numero', 'es-BO')).toMatchObject({ texto: '1.000' })
  })

  it('un anio no lleva separador de miles', () => {
    expect(celdaDeTabla(2018, 'anio', 'es-BO')).toEqual({ tipo: 'texto', texto: '2018' })
  })

  it('un texto va tal cual; un número en una columna de texto, formateado; un booleano, Sí/No', () => {
    expect(celdaDeTabla('camionetas_medianas', 'texto', 'es-BO')).toEqual({
      tipo: 'texto',
      texto: 'camionetas_medianas',
    })
    expect(celdaDeTabla(1500, 'texto', 'es-BO')).toEqual({ tipo: 'texto', texto: '1.500' })
    expect(celdaDeTabla(true, 'texto', 'es-BO').texto).toBe('Sí')
    expect(celdaDeTabla(false, 'otro', 'es-BO').texto).toBe('No')
  })

  it('nulo, ausente, vacío o un objeto: «—»', () => {
    for (const valor of [null, undefined, '', { a: 1 }]) {
      expect(celdaDeTabla(valor, 'numero', 'es-BO')).toEqual({ tipo: 'texto', texto: '—' })
    }
  })

  it('un número no finito no es una cifra', () => {
    expect(celdaDeTabla(Number.NaN, 'numero', 'es-BO').tipo).toBe('texto')
  })
})
