import { describe, expect, it } from 'vitest'
import type { Condicion } from '../../entities/filtros'
import {
  aplicarCondiciones,
  aplicarCursor,
  citar,
  patronContiene,
  type Filtrable,
} from './condiciones'

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
    or: (filtros: string) => con(`or=(${filtros})`),
  }
}

const pedidosDe = (...condiciones: Condicion[]) =>
  aplicarCondiciones(anotador(), condiciones).pedidos

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

describe('aplicarCondiciones', () => {
  it('sin condiciones no toca la consulta', () => {
    expect(pedidosDe()).toEqual([])
  })

  it('la búsqueda mira título, VIN y lote, con el texto citado', () => {
    expect(pedidosDe({ tipo: 'busqueda', texto: 'a, b (c)' })).toEqual([
      'or=(titulo.ilike."*a, b (c)*",vin.ilike."*a, b (c)*",lote.ilike."*a, b (c)*")',
    ])
  })

  it('una columna entre varios valores, con o sin «no tiene»', () => {
    const en = (valores: string[], incluirNulo: boolean): Condicion => ({
      tipo: 'columna_en',
      columna: 'fase_id',
      valores,
      incluirNulo,
    })
    expect(pedidosDe(en(['f1', 'f2'], false))).toEqual(['fase_id=in.(f1,f2)'])
    expect(pedidosDe(en([], true))).toEqual(['fase_id=is.null'])
    expect(pedidosDe(en(['f1'], true))).toEqual(['or=(fase_id.is.null,fase_id.in.(f1))'])
  })

  it('un rango sobre una columna pone sólo los bordes que hay', () => {
    expect(pedidosDe({ tipo: 'columna_rango', columna: 'anio', min: 2015, max: null })).toEqual([
      'anio=gte.2015',
    ])
    expect(pedidosDe({ tipo: 'columna_rango', columna: 'anio', min: 2015, max: 2020 })).toEqual([
      'anio=gte.2015',
      'anio=lte.2020',
    ])
  })

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

  it('varias condiciones se suman en orden', () => {
    expect(
      pedidosDe(
        { tipo: 'busqueda', texto: 'rav4' },
        { tipo: 'columna_rango', columna: 'anio', min: null, max: 2020 },
      ),
    ).toHaveLength(2)
  })
})

describe('en vitrina', () => {
  it('sí: publicado y en una fase que publica; sin fases, nada', () => {
    expect(pedidosDe({ tipo: 'en_vitrina', valor: true, fases: ['f1', 'f2'] })).toEqual([
      'publicado_web=eq.true',
      'fase_id=in.(f1,f2)',
    ])
    expect(pedidosDe({ tipo: 'en_vitrina', valor: true, fases: [] })).toEqual([
      'publicado_web=eq.true',
      'fase_id=in.()',
    ])
  })

  it('no: sin publicar, sin fase o en otra fase; sin fases que publiquen, todo', () => {
    expect(pedidosDe({ tipo: 'en_vitrina', valor: false, fases: ['f1'] })).toEqual([
      'or=(publicado_web.is.false,fase_id.is.null,fase_id.not.in.(f1))',
    ])
    expect(pedidosDe({ tipo: 'en_vitrina', valor: false, fases: [] })).toEqual([])
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

describe('por limpiar', () => {
  it('sí: importado y con fecha de limpieza hasta ese día (nulo, o con ancla, no entra)', () => {
    expect(pedidosDe({ tipo: 'por_limpiar', valor: true, hasta: '2026-10-17' })).toEqual([
      'importado_apibara=eq.true',
      'limpieza_el=lte.2026-10-17',
    ])
  })

  it('no: lo que no es importado, no tiene fecha o la tiene después', () => {
    expect(pedidosDe({ tipo: 'por_limpiar', valor: false, hasta: '2026-10-17' })).toEqual([
      'or=(importado_apibara.is.false,limpieza_el.is.null,limpieza_el.gt.2026-10-17)',
    ])
  })
})
