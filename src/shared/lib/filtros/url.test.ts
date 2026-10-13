import { describe, expect, it } from 'vitest'
import type { DefFiltro, EsquemaDeFiltros } from './esquema'
import {
  clavesDeUrl,
  escribirFiltro,
  hayFiltros,
  leerFiltros,
  limpiarFiltros,
  parametrosDeFiltros,
} from './url'

const FASE: DefFiltro = {
  tipo: 'opciones',
  clave: 'fase',
  etiqueta: 'Fase',
  opciones: [
    { valor: 'a', etiqueta: 'En subasta' },
    { valor: 'b', etiqueta: 'Comprado' },
  ],
}
const LLAVE: DefFiltro = { tipo: 'booleano', clave: 'a.llave', etiqueta: 'Tiene llave' }
const ANIO: DefFiltro = {
  tipo: 'rango_numero',
  clave: 'anio',
  etiqueta: 'Año',
  minimo: 1900,
  maximo: 2100,
  entero: true,
  sinMiles: true,
}
const LLEGADA: DefFiltro = { tipo: 'rango_fecha', clave: 'a.llegada', etiqueta: 'Llegada' }
const COLOR: DefFiltro = { tipo: 'texto', clave: 'a.color', etiqueta: 'Color' }

const ESQUEMA: EsquemaDeFiltros = {
  busqueda: { clave: 'q', etiqueta: 'Buscar' },
  filtros: [FASE, LLAVE, ANIO, LLEGADA, COLOR],
}

describe('clavesDeUrl', () => {
  it('un rango ocupa dos claves', () => {
    expect(clavesDeUrl(ESQUEMA)).toEqual([
      'q',
      'fase',
      'a.llave',
      'anio.min',
      'anio.max',
      'a.llegada.desde',
      'a.llegada.hasta',
      'a.color',
    ])
  })
})

describe('leerFiltros', () => {
  it('sin parámetros no filtra nada', () => {
    const valores = leerFiltros(ESQUEMA, {})
    expect(valores).toEqual({ busqueda: '', porClave: {} })
    expect(hayFiltros(valores)).toBe(false)
  })

  it('lee cada tipo de filtro', () => {
    const valores = leerFiltros(ESQUEMA, {
      q: '  rav4 ',
      fase: 'b,a',
      'a.llave': 'si',
      'anio.min': '2015',
      'a.llegada.hasta': '2026-10-13',
      'a.color': 'gris',
    })
    expect(valores.busqueda).toBe('rav4')
    expect(valores.porClave).toEqual({
      fase: { tipo: 'opciones', valores: ['b', 'a'] },
      'a.llave': { tipo: 'booleano', valor: true },
      anio: { tipo: 'rango_numero', min: 2015, max: null },
      'a.llegada': { tipo: 'rango_fecha', desde: null, hasta: '2026-10-13' },
      'a.color': { tipo: 'texto', texto: 'gris' },
    })
    expect(hayFiltros(valores)).toBe(true)
  })

  it('descarta lo que no corresponde al esquema, sin romper', () => {
    const valores = leerFiltros(ESQUEMA, {
      fase: 'zzz,b,b',
      'a.llave': 'quizas',
      'anio.min': 'abc',
      'anio.max': '99999',
      'a.llegada.desde': '2026-02-31',
      'a.llegada.hasta': 'mañana',
      desconocido: 'x',
    })
    expect(valores.porClave).toEqual({ fase: { tipo: 'opciones', valores: ['b'] } })
  })

  it('un entero no acepta decimales y un rango al revés se da vuelta', () => {
    expect(leerFiltros(ESQUEMA, { 'anio.min': '2015.5' }).porClave).toEqual({})
    expect(
      leerFiltros(ESQUEMA, { 'anio.min': '2020', 'anio.max': '2010' }).porClave['anio'],
    ).toEqual({ tipo: 'rango_numero', min: 2010, max: 2020 })
    expect(
      leerFiltros(ESQUEMA, { 'a.llegada.desde': '2026-12-01', 'a.llegada.hasta': '2026-01-01' })
        .porClave['a.llegada'],
    ).toEqual({ tipo: 'rango_fecha', desde: '2026-01-01', hasta: '2026-12-01' })
  })

  it('de un parámetro repetido toma el primero y recorta un texto enorme', () => {
    expect(leerFiltros(ESQUEMA, { q: ['uno', 'dos'] }).busqueda).toBe('uno')
    expect(leerFiltros(ESQUEMA, { q: 'x'.repeat(500) }).busqueda).toHaveLength(100)
  })

  it('un esquema sin búsqueda ignora la búsqueda', () => {
    expect(leerFiltros({ busqueda: null, filtros: [] }, { q: 'x' })).toEqual({
      busqueda: '',
      porClave: {},
    })
  })
})

describe('escribirFiltro', () => {
  it('escribe cada tipo y quita lo vacío', () => {
    expect(escribirFiltro(FASE, { tipo: 'opciones', valores: ['a', 'b'] })).toEqual({ fase: 'a,b' })
    expect(escribirFiltro(FASE, { tipo: 'opciones', valores: [] })).toEqual({ fase: null })
    expect(escribirFiltro(LLAVE, { tipo: 'booleano', valor: false })).toEqual({ 'a.llave': 'no' })
    expect(escribirFiltro(ANIO, { tipo: 'rango_numero', min: 2015, max: null })).toEqual({
      'anio.min': '2015',
      'anio.max': null,
    })
    expect(
      escribirFiltro(LLEGADA, { tipo: 'rango_fecha', desde: '2026-01-01', hasta: null }),
    ).toEqual({ 'a.llegada.desde': '2026-01-01', 'a.llegada.hasta': null })
    expect(escribirFiltro(COLOR, { tipo: 'texto', texto: '  ' })).toEqual({ 'a.color': null })
  })

  it('null quita todas las claves del filtro', () => {
    expect(escribirFiltro(ANIO, null)).toEqual({ 'anio.min': null, 'anio.max': null })
  })
})

describe('limpiarFiltros y parametrosDeFiltros', () => {
  it('limpiar deja todas las claves en null', () => {
    expect(limpiarFiltros(ESQUEMA)).toEqual({
      q: null,
      fase: null,
      'a.llave': null,
      'anio.min': null,
      'anio.max': null,
      'a.llegada.desde': null,
      'a.llegada.hasta': null,
      'a.color': null,
    })
  })

  it('lo que guarda una vista se vuelve a leer igual', () => {
    const valores = leerFiltros(ESQUEMA, { q: 'rav4', fase: 'a', 'anio.max': '2020', basura: 'x' })
    const guardado = parametrosDeFiltros(ESQUEMA, valores)
    expect(guardado).toEqual({ q: 'rav4', fase: 'a', 'anio.max': '2020' })
    expect(leerFiltros(ESQUEMA, guardado)).toEqual(valores)
  })
})
