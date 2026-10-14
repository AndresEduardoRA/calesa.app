import { describe, expect, it } from 'vitest'
import type { Filtrable } from '@/shared/lib/supabase/consultas'
import type { CondicionDeLead } from '../../entities/filtros'
import { aplicarCondicionesDeLeads } from './condiciones'

interface Anotador extends Filtrable<Anotador> {
  pedidos: string[]
}

function anotador(pedidos: string[] = []): Anotador {
  const con = (pedido: string) => anotador([...pedidos, pedido])
  return {
    pedidos,
    in: (columna, valores) => con(`${columna}=in.(${valores.join(',')})`),
    eq: (columna, valor) => con(`${columna}=eq.${String(valor)}`),
    is: (columna) => con(`${columna}=is.null`),
    gte: (columna, valor) => con(`${columna}=gte.${String(valor)}`),
    lte: (columna, valor) => con(`${columna}=lte.${String(valor)}`),
    lt: (columna, valor) => con(`${columna}=lt.${String(valor)}`),
    ilike: (columna, patron) => con(`${columna}=ilike.${patron}`),
    contains: (columna, valor) => con(`${columna}=cs.${JSON.stringify(valor)}`),
    or: (filtros) => con(`or=(${filtros})`),
  }
}

const pedidosDe = (...condiciones: CondicionDeLead[]) =>
  aplicarCondicionesDeLeads(anotador(), condiciones).pedidos

describe('aplicarCondicionesDeLeads', () => {
  it('sin condiciones no toca la consulta', () => {
    expect(pedidosDe()).toEqual([])
  })

  it('la búsqueda mira el nombre, con el texto literal y citado', () => {
    expect(pedidosDe({ tipo: 'busqueda', texto: 'a, b (c) "d" 50%_', numero: null })).toEqual([
      'or=(nombre.ilike."*a, b (c) \\"d\\" 50\\\\%\\\\_*")',
    ])
  })

  it('un número suma el número de lead, y nunca el teléfono', () => {
    const pedidos = pedidosDe({ tipo: 'busqueda', texto: '124', numero: 124 })
    expect(pedidos).toEqual(['or=(nombre.ilike."*124*",numero.eq.124)'])
    expect(pedidos.join()).not.toMatch(/telefono/)
  })

  it('tipo y origen del lead son columnas; «míos» es la cartera', () => {
    expect(
      pedidosDe(
        { tipo: 'columna_en', columna: 'tipo', valores: ['cliente'] },
        { tipo: 'columna_en', columna: 'origen_lead_id', valores: ['o1', 'o2'] },
        { tipo: 'en_cartera' },
      ),
    ).toEqual(['tipo=in.(cliente)', 'origen_lead_id=in.(o1,o2)', 'en_cartera=eq.true'])
  })

  it('los atributos pasan por la traducción compartida', () => {
    expect(pedidosDe({ tipo: 'atributo_texto', clave: 'ciudad', texto: 'cruz' })).toEqual([
      'atributos->>ciudad=ilike.*cruz*',
    ])
  })
})
