import { describe, expect, it } from 'vitest'
import type { Condicion } from '../../entities/filtros'
import type { Filtrable } from '@/shared/lib/supabase/consultas'
import { aplicarCondiciones } from './condiciones'

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

const pedidosDe = (...condiciones: Condicion[]) =>
  aplicarCondiciones(anotador(), condiciones).pedidos

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
