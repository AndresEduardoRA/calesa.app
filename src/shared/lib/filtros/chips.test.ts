import { describe, expect, it } from 'vitest'
import { chipsDe } from './chips'
import type { EsquemaDeFiltros } from './esquema'
import { leerFiltros } from './url'

const ESQUEMA = {
  busqueda: { clave: 'q', etiqueta: 'Buscar' },
  filtros: [
    {
      tipo: 'opciones',
      clave: 'fase',
      etiqueta: 'Fase',
      opciones: [
        { valor: 'a', etiqueta: 'En subasta' },
        { valor: 'b', etiqueta: 'Comprado' },
      ],
    },
    { tipo: 'booleano', clave: 'a.llave', etiqueta: 'Tiene llave' },
    {
      tipo: 'rango_numero',
      clave: 'anio',
      etiqueta: 'Año',
      minimo: 1900,
      maximo: 2100,
      entero: true,
      sinMiles: true,
    },
    {
      tipo: 'rango_numero',
      clave: 'a.km',
      etiqueta: 'Kilometraje',
      minimo: 0,
      maximo: 2_000_000,
      entero: true,
    },
    { tipo: 'rango_fecha', clave: 'a.llegada', etiqueta: 'Llegada' },
    { tipo: 'texto', clave: 'a.color', etiqueta: 'Color' },
  ],
} satisfies EsquemaDeFiltros

function chips(parametros: Record<string, string>) {
  return chipsDe(ESQUEMA, leerFiltros(ESQUEMA, parametros), {
    locale: 'es-BO',
    zona: 'America/La_Paz',
  })
}

describe('chipsDe', () => {
  it('sin filtros no hay chips', () => {
    expect(chips({})).toEqual([])
  })

  it('una opción elegida es un chip, y quitarlo deja las demás', () => {
    expect(chips({ fase: 'a,b' })).toEqual([
      { id: 'fase:a', texto: 'Fase: En subasta', alQuitar: { fase: 'b' } },
      { id: 'fase:b', texto: 'Fase: Comprado', alQuitar: { fase: 'a' } },
    ])
    expect(chips({ fase: 'a' })[0]?.alQuitar).toEqual({ fase: null })
  })

  it('dice los rangos en palabras, con el año sin separador de miles', () => {
    expect(chips({ 'anio.min': '2015', 'anio.max': '2020' })[0]?.texto).toBe('Año: 2015 a 2020')
    expect(chips({ 'anio.min': '2015' })[0]?.texto).toBe('Año: desde 2015')
    expect(chips({ 'anio.max': '2020' })[0]?.texto).toBe('Año: hasta 2020')
    expect(chips({ 'anio.min': '2015', 'anio.max': '2015' })[0]?.texto).toBe('Año: 2015')
    expect(chips({ 'a.km.max': '80000' })[0]?.texto).toBe('Kilometraje: hasta 80.000')
    expect(chips({ 'anio.min': '2015' })[0]?.alQuitar).toEqual({
      'anio.min': null,
      'anio.max': null,
    })
  })

  it('las fechas van con el formato de la empresa', () => {
    expect(chips({ 'a.llegada.desde': '2026-10-13' })[0]?.texto).toBe('Llegada: desde 13 oct 2026')
  })

  it('la búsqueda, el sí o no y el texto', () => {
    expect(
      chips({ q: 'rav4', 'a.llave': 'no', 'a.color': 'gris' }).map((chip) => chip.texto),
    ).toEqual(['«rav4»', 'Tiene llave: no', 'Color: «gris»'])
    expect(chips({ q: 'rav4' })[0]?.alQuitar).toEqual({ q: null })
  })
})

describe('el mínimo de la búsqueda', () => {
  const CON_MINIMO: EsquemaDeFiltros = {
    busqueda: {
      clave: 'q',
      etiqueta: 'Buscar',
      minimo: { letras: 3, numerosLibres: true, aviso: 'Escribe al menos 3 letras' },
    },
    filtros: [],
  }
  const chips = (q: string) => chipsDe(CON_MINIMO, leerFiltros(CON_MINIMO, { q }))

  it('un texto que no alcanza no es un chip; uno que alcanza, sí', () => {
    expect(chips('ab')).toEqual([])
    expect(chips('a_b')).toEqual([])
    expect(chips('abc').map((chip) => chip.texto)).toEqual(['«abc»'])
    expect(chips('12').map((chip) => chip.texto)).toEqual(['«12»'])
  })

  it('sin mínimo, cualquier texto es un chip', () => {
    expect(chipsDe(ESQUEMA, leerFiltros(ESQUEMA, { q: 'ab' })).map((chip) => chip.texto)).toEqual([
      '«ab»',
    ])
  })
})
