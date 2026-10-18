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
    overlaps: (columna, valores) => con(`${columna}=ov.{${valores.join(',')}}`),
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
    expect(
      pedidosDe({
        tipo: 'busqueda',
        texto: 'a, b (c) "d" 50%_',
        numero: null,
        soloNumero: false,
        idsDelNumero: [],
      }),
    ).toEqual(['or=(nombre.ilike."*a, b (c) \\"d\\" 50\\\\%\\\\_*")'])
  })

  const ID = '5a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

  it('un número suma el lead con ese número (ya resuelto a su id), y nunca el teléfono', () => {
    const pedidos = pedidosDe({
      tipo: 'busqueda',
      texto: '124',
      numero: 124,
      soloNumero: false,
      idsDelNumero: [ID],
    })
    expect(pedidos).toEqual([`or=(nombre.ilike."*124*",id.in.(${ID}))`])
    expect(pedidos.join()).not.toMatch(/telefono|numero/)
  })

  it('«#124» busca sólo el número: el lead con ese id, o ninguno', () => {
    const base = { tipo: 'busqueda', texto: '124', numero: 124, soloNumero: true } as const
    expect(pedidosDe({ ...base, idsDelNumero: [ID] })).toEqual([`or=(id.in.(${ID}))`])
    // Sin lead con ese número (o que no se ve): un id que ninguna fila tiene.
    expect(pedidosDe({ ...base, idsDelNumero: [] })).toEqual([
      'id=in.(00000000-0000-0000-0000-000000000000)',
    ])
  })

  it('un número sin lead visible sigue buscando el nombre', () => {
    expect(
      pedidosDe({
        tipo: 'busqueda',
        texto: '124',
        numero: 124,
        soloNumero: false,
        idsDelNumero: [],
      }),
    ).toEqual(['or=(nombre.ilike."*124*")'])
  })

  it('tipo y origen del lead son columnas; «míos» es la cartera', () => {
    expect(
      pedidosDe(
        { tipo: 'columna_en', columna: 'tipo_lead_id', valores: ['t1'] },
        { tipo: 'columna_en', columna: 'origen_lead_id', valores: ['o1', 'o2'] },
        { tipo: 'en_cartera', desdeLaCartera: false },
      ),
    ).toEqual(['tipo_lead_id=in.(t1)', 'origen_lead_id=in.(o1,o2)', 'en_cartera=eq.true'])
  })
})

describe('aplicarCondicionesDeLeads: atributos y marcas', () => {
  it('los atributos pasan por la traducción compartida, sobre la columna que eligió el layout (9h)', () => {
    expect(
      pedidosDe({ tipo: 'atributo_texto', clave: 'ciudad', texto: 'cruz', columna: 'atributos' }),
    ).toEqual(['atributos->>ciudad=ilike.*cruz*'])
    expect(
      pedidosDe(
        {
          tipo: 'atributos_contienen',
          alternativas: [{ ciudad: 'lp' }],
          columna: 'atributos_publicos',
        },
        {
          tipo: 'atributo_rango_numero',
          clave: 'edad',
          min: 30,
          max: null,
          columna: 'atributos_publicos',
        },
      ),
    ).toEqual(['atributos_publicos=cs.{"ciudad":"lp"}', 'atributos_publicos->edad=gte.30'])
  })

  it('las marcas de quien mira van sobre las columnas de la vista', () => {
    expect(
      pedidosDe(
        { tipo: 'tachado', valor: false },
        { tipo: 'favorito', valor: true },
        { tipo: 'etiquetas', ids: ['a', 'b'] },
      ),
    ).toEqual(['esta_tachado=eq.false', 'es_favorito=eq.true', 'etiquetas=ov.{a,b}'])
  })
})
