import { describe, expect, it } from 'vitest'
import type { CondicionDeAtributo } from '../filtros/campos'
import {
  aplicarCondicionDeAtributo,
  aplicarCursor,
  aplicarRango,
  citar,
  patronContiene,
  type Filtrable,
} from './consultas'

// Un constructor de consultas de mentira: anota lo que se le pide, como lo mandaría PostgREST.
interface Anotador extends Filtrable<Anotador> {
  pedidos: string[]
}

function anotador(pedidos: string[] = []): Anotador {
  const con = (pedido: string) => anotador([...pedidos, pedido])
  const escribir = (valor: string | number) => String(valor)
  return {
    pedidos,
    in: (columna: string, valores: readonly string[]) =>
      con(`${columna}=in.(${valores.join(',')})`),
    eq: (columna: string, valor: boolean) => con(`${columna}=eq.${String(valor)}`),
    is: (columna: string) => con(`${columna}=is.null`),
    gte: (columna: string, valor: string | number) => con(`${columna}=gte.${escribir(valor)}`),
    lte: (columna: string, valor: string | number) => con(`${columna}=lte.${escribir(valor)}`),
    lt: (columna: string, valor: string | number) => con(`${columna}=lt.${escribir(valor)}`),
    ilike: (columna: string, patron: string) => con(`${columna}=ilike.${patron}`),
    contains: (columna: string, valor: Record<string, unknown>) =>
      con(`${columna}=cs.${JSON.stringify(valor)}`),
    overlaps: (columna: string, valores: readonly string[]) =>
      con(`${columna}=ov.{${valores.join(',')}}`),
    or: (filtros: string) => con(`or=(${filtros})`),
  }
}

const pedidosDe = (...condiciones: CondicionDeAtributo[]) =>
  condiciones.reduce((parcial, uno) => aplicarCondicionDeAtributo(parcial, uno), anotador()).pedidos

describe('saneadores', () => {
  it('citar encierra entre comillas y escapa la comilla y la barra', () => {
    expect(citar('a, b (c)')).toBe('"a, b (c)"')
    expect(citar('di "hola"')).toBe('"di \\"hola\\""')
    expect(citar('C:\\autos')).toBe('"C:\\\\autos"')
  })

  it('lo que escribe la persona es literal: %, _ y * dejan de ser comodines libres', () => {
    expect(patronContiene('rav4')).toBe('*rav4*')
    expect(patronContiene('100%')).toBe('*100\\%*')
    expect(patronContiene('a_b')).toBe('*a\\_b*')
    expect(patronContiene('a*b')).toBe('*a_b*')
    expect(patronContiene('a\\b')).toBe('*a\\\\b*')
  })
})

describe('aplicarRango', () => {
  it('pone sólo los bordes que hay', () => {
    expect(aplicarRango(anotador(), { columna: 'anio', desde: 2015, hasta: null }).pedidos).toEqual(
      ['anio=gte.2015'],
    )
    expect(aplicarRango(anotador(), { columna: 'anio', desde: 2015, hasta: 2020 }).pedidos).toEqual(
      ['anio=gte.2015', 'anio=lte.2020'],
    )
    expect(
      aplicarRango(anotador(), {
        columna: 'f',
        desde: null,
        hasta: '2026-10-14',
        hastaExclusivo: true,
      }).pedidos,
    ).toEqual(['f=lt.2026-10-14'])
  })
})

describe('aplicarCondicionDeAtributo', () => {
  it('una alternativa es una contención; varias, un or con el JSON citado', () => {
    expect(
      pedidosDe({ tipo: 'atributos_contienen', alternativas: [{ transmision: 'manual' }] }),
    ).toEqual(['atributos=cs.{"transmision":"manual"}'])
    expect(
      pedidosDe({
        tipo: 'atributos_contienen',
        alternativas: [{ color: 'Gris "perla", {x}' }, { extras: ['techo'] }],
      }),
    ).toEqual([
      'or=(atributos.cs."{\\"color\\":\\"Gris \\\\\\"perla\\\\\\", {x}\\"}",atributos.cs."{\\"extras\\":[\\"techo\\"]}")',
    ])
    expect(pedidosDe({ tipo: 'atributos_contienen', alternativas: [] })).toEqual([])
  })

  it('un número de un atributo se compara como jsonb y una fecha como texto, con el final exclusivo', () => {
    expect(pedidosDe({ tipo: 'atributo_rango_numero', clave: 'km', min: 1000, max: 5000 })).toEqual(
      ['atributos->km=gte.1000', 'atributos->km=lte.5000'],
    )
    expect(
      pedidosDe({
        tipo: 'atributo_rango_texto',
        clave: 'llegada',
        desde: '2026-10-13',
        antesDe: '2026-10-15',
      }),
    ).toEqual(['atributos->>llegada=gte.2026-10-13', 'atributos->>llegada=lt.2026-10-15'])
  })

  it('el texto de un atributo es «contiene», literal', () => {
    expect(pedidosDe({ tipo: 'atributo_texto', clave: 'color', texto: '50%' })).toEqual([
      'atributos->>color=ilike.*50\\%*',
    ])
  })
})

describe('aplicarCursor', () => {
  const base = { creadoEn: '2026-10-13T12:00:00.123456+00:00', id: 'abc' }

  it('sin cursor es la primera página', () => {
    expect(aplicarCursor(anotador(), null).pedidos).toEqual([])
  })

  it('hacia adelante: el borde va aparte (entra al índice) y el or desempata por id', () => {
    expect(aplicarCursor(anotador(), { ...base, sentido: 'siguiente' }).pedidos).toEqual([
      'creado_en=lte.2026-10-13T12:00:00.123456+00:00',
      'or=(creado_en.lt."2026-10-13T12:00:00.123456+00:00",id.lt.abc)',
    ])
  })

  it('hacia atrás, al revés', () => {
    expect(aplicarCursor(anotador(), { ...base, sentido: 'anterior' }).pedidos).toEqual([
      'creado_en=gte.2026-10-13T12:00:00.123456+00:00',
      'or=(creado_en.gt."2026-10-13T12:00:00.123456+00:00",id.gt.abc)',
    ])
  })
})
