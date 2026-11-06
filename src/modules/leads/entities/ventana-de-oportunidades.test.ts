import { describe, expect, it } from 'vitest'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { Embudo } from './embudo'
import type { Oportunidad, OportunidadDelLead } from './oportunidad'
import {
  caminoAlEmbudo,
  cursorDeOportunidades,
  oportunidadDelLeadDesde,
  ordenDeOportunidades,
  ponerOportunidadEnLaVentana,
  sumarPaginaDeOportunidades,
} from './ventana-de-oportunidades'

const ETAPA = {
  id: 'e1',
  nombre: 'Nuevo',
  color: 'gris',
  esGanada: false,
  esPerdida: false,
} as const

function una(
  id: string,
  en: string,
  estado: Oportunidad['estado'] = 'abierta',
): OportunidadDelLead {
  return {
    id,
    leadId: 'l',
    embudoId: 'm',
    etapaId: 'e1',
    estado,
    titulo: `T ${id}`,
    notas: null,
    monto: null,
    moneda: 'USD',
    motivoPerdida: null,
    enEtapaDesde: en,
    actualizadoEn: en,
    eliminada: false,
    vehiculoId: null,
    vehiculoOculto: false,
    etapa: ETAPA,
    embudo: { id: 'm', nombre: 'Ventas' },
  } as unknown as OportunidadDelLead
}

const ids = (lista: readonly { id: string }[]) => lista.map((o) => o.id)
const sello = (segundos: number, fraccion = '') =>
  `2026-11-06T12:00:${String(segundos).padStart(2, '0')}${fraccion}+00:00`

describe('ordenDeOportunidades', () => {
  it('las abiertas antes que las cerradas, aunque la cerrada sea más nueva', () => {
    const cerrada = una('a', sello(50), 'ganada')
    const abierta = una('b', sello(10))
    expect(ordenDeOportunidades(abierta, cerrada)).toBeLessThan(0)
    expect(ordenDeOportunidades(cerrada, abierta)).toBeGreaterThan(0)
    expect(ordenDeOportunidades(una('c', sello(10), 'cancelada'), cerrada)).toBeGreaterThan(0)
  })

  it('en cada grupo, la más reciente primero y, a igual instante, el id más alto', () => {
    expect(ordenDeOportunidades(una('a', sello(20)), una('b', sello(10)))).toBeLessThan(0)
    expect(ordenDeOportunidades(una('b', sello(10)), una('a', sello(10)))).toBeLessThan(0)
    expect(ordenDeOportunidades(una('a', sello(10)), una('a', sello(10)))).toBe(0)
  })

  it('compara los microsegundos: dos sellos del mismo milisegundo no empatan (4-90)', () => {
    const antes = una('a', sello(48, '.1234'))
    const despues = una('b', sello(48, '.12341'))
    // `.1234` es `.123400` y `.12341` es `.123410`: la segunda es más nueva.
    expect(ordenDeOportunidades(despues, antes)).toBeLessThan(0)
    expect(ordenDeOportunidades(antes, despues)).toBeGreaterThan(0)
    expect(
      ordenDeOportunidades(una('a', sello(48, '.123456')), una('b', sello(48, '.123455'))),
    ).toBeLessThan(0)
  })

  it('un sello sin fracción es el de fracción cero y va después del que la tiene', () => {
    const sinFraccion = una('a', sello(48))
    const conFraccion = una('b', sello(48, '.000001'))
    expect(ordenDeOportunidades(conFraccion, sinFraccion)).toBeLessThan(0)
    expect(ordenDeOportunidades(sinFraccion, una('c', sello(48, '.000000')))).toBeGreaterThan(0)
  })

  it('el texto no decide: `.9` es más nuevo que `.12` aunque el texto diga lo contrario', () => {
    expect(
      ordenDeOportunidades(una('a', sello(48, '.9')), una('b', sello(48, '.12'))),
    ).toBeLessThan(0)
  })
})

describe('ponerOportunidadEnLaVentana', () => {
  const ventana = (lista: OportunidadDelLead[], hayMas = false) => ({ lista, hayMas })

  it('reemplaza la que ya está, en su lugar', () => {
    const lista = [una('a', sello(30)), una('b', sello(20)), una('c', sello(10))]
    const editada = { ...una('b', sello(20)), titulo: 'Otro' }
    const puesta = ponerOportunidadEnLaVentana(ventana(lista), editada)
    expect(ids(puesta.lista)).toEqual(['a', 'b', 'c'])
    expect(puesta.lista[1]?.titulo).toBe('Otro')
  })

  it('una nueva abierta queda arriba de las abiertas y una cerrada arriba de las cerradas', () => {
    const lista = [una('a', sello(30)), una('c', sello(5), 'ganada')]
    expect(ids(ponerOportunidadEnLaVentana(ventana(lista), una('n', sello(40))).lista)).toEqual([
      'n',
      'a',
      'c',
    ])
    expect(
      ids(ponerOportunidadEnLaVentana(ventana(lista), una('m', sello(50), 'perdida')).lista),
    ).toEqual(['a', 'm', 'c'])
  })

  it('mover de abierta a cerrada la lleva al grupo de las cerradas', () => {
    const lista = [una('a', sello(30)), una('b', sello(20)), una('c', sello(10), 'ganada')]
    const movida = { ...una('a', sello(55), 'ganada') }
    expect(ids(ponerOportunidadEnLaVentana(ventana(lista), movida).lista)).toEqual(['b', 'a', 'c'])
  })

  it('una eliminada sale', () => {
    const lista = [una('a', sello(30)), una('b', sello(20))]
    const eliminada = { ...una('a', sello(30)), eliminada: true }
    expect(ids(ponerOportunidadEnLaVentana(ventana(lista), eliminada).lista)).toEqual(['b'])
  })

  it('con más por leer, la que cae después de la última cargada sale: vuelve con «Ver más»', () => {
    const lista = [una('a', sello(30)), una('b', sello(20))]
    const puesta = ponerOportunidadEnLaVentana(ventana(lista, true), una('z', sello(1)))
    expect(ids(puesta.lista)).toEqual(['a', 'b'])
    expect(puesta.hayMas).toBe(true)
  })

  it('sin más por leer, la que cae al final entra', () => {
    const lista = [una('a', sello(30)), una('b', sello(20))]
    const puesta = ponerOportunidadEnLaVentana(ventana(lista, false), una('z', sello(1)))
    expect(ids(puesta.lista)).toEqual(['a', 'b', 'z'])
    expect(puesta.hayMas).toBe(false)
  })

  it('la última cargada que se mueve más atrás sale con «hay más» (ya no es la última)', () => {
    const lista = [una('a', sello(30)), una('b', sello(20))]
    const puesta = ponerOportunidadEnLaVentana(ventana(lista, true), una('b', sello(5)))
    expect(ids(puesta.lista)).toEqual(['a'])
  })

  it('en el tope corta la última y deja «hay más»', () => {
    const llena = Array.from({ length: TOPE_DE_LO_CARGADO }, (_, i) =>
      una(`o${String(1000 + i)}`, sello(59 - Math.floor(i / 100), `.${String(999999 - i)}`)),
    ).sort(ordenDeOportunidades)
    const ultima = llena.at(-1)
    const puesta = ponerOportunidadEnLaVentana(
      ventana(llena, false),
      una('zzz', sello(59, '.9999999')),
    )
    expect(puesta.lista).toHaveLength(TOPE_DE_LO_CARGADO)
    expect(puesta.lista[0]?.id).toBe('zzz')
    expect(puesta.lista.some((o) => o.id === ultima?.id)).toBe(false)
    expect(puesta.hayMas).toBe(true)
  })

  it('no toca la ventana que recibe', () => {
    const lista = [una('a', sello(30))]
    ponerOportunidadEnLaVentana(ventana(lista), una('n', sello(40)))
    expect(ids(lista)).toEqual(['a'])
  })
})

describe('oportunidadDelLeadDesde', () => {
  const embudos: Embudo[] = [
    {
      id: 'm',
      nombre: 'Ventas',
      esDefault: true,
      actualizadoEn: sello(1),
      etapas: [
        {
          id: 'e1',
          nombre: 'Nuevo',
          color: 'gris',
          esInicial: true,
          esGanada: false,
          esPerdida: false,
        },
        {
          id: 'e2',
          nombre: 'Ganado',
          color: 'verde',
          esInicial: false,
          esGanada: true,
          esPerdida: false,
        },
      ],
    },
  ]
  const { etapa: _etapa, embudo: _embudo, ...oportunidad } = una('a', sello(10))

  it('arma el embudo y la etapa con los de la sección', () => {
    const lista = oportunidadDelLeadDesde({ ...oportunidad, etapaId: 'e2' }, embudos)
    expect(lista?.etapa).toEqual({
      id: 'e2',
      nombre: 'Ganado',
      color: 'verde',
      esGanada: true,
      esPerdida: false,
    })
    expect(lista?.embudo).toEqual({ id: 'm', nombre: 'Ventas' })
    expect(lista?.id).toBe('a')
  })

  it('da null si el embudo o la etapa no están', () => {
    expect(oportunidadDelLeadDesde({ ...oportunidad, embudoId: 'x' }, embudos)).toBeNull()
    expect(oportunidadDelLeadDesde({ ...oportunidad, etapaId: 'x' }, embudos)).toBeNull()
  })
})

describe('cursorDeOportunidades', () => {
  it('es la última cargada, con su grupo y su instante tal como llegó', () => {
    const abierta = una('b', sello(48, '.1234'))
    expect(cursorDeOportunidades([una('a', sello(50)), abierta])).toEqual({
      antesAbierta: true,
      antesEn: '2026-11-06T12:00:48.1234+00:00',
      antesId: 'b',
    })
    const cerrada = una('c', sello(10, '.5'), 'perdida')
    expect(cursorDeOportunidades([una('a', sello(50)), cerrada])).toEqual({
      antesAbierta: false,
      antesEn: '2026-11-06T12:00:10.5+00:00',
      antesId: 'c',
    })
  })

  it('sin nada cargado no hay cursor', () => {
    expect(cursorDeOportunidades([])).toBeNull()
  })
})

describe('sumarPaginaDeOportunidades', () => {
  const ventana = (lista: OportunidadDelLead[], hayMas = true) => ({ lista, hayMas })
  const pagina = (lista: OportunidadDelLead[], hayMas: boolean) => ({ lista, hayMas })
  const ninguna = new Set<string>()

  it('suma al final lo de la página y toma su «hay más»', () => {
    const suma = sumarPaginaDeOportunidades(
      ventana([una('a', sello(50)), una('b', sello(40))]),
      pagina([una('c', sello(30)), una('d', sello(20))], false),
      ninguna,
    )
    expect(ids(suma.lista)).toEqual(['a', 'b', 'c', 'd'])
    expect(suma.hayMas).toBe(false)
  })

  it('no repite las que ya están ni trae las quitadas mientras la página venía', () => {
    const suma = sumarPaginaDeOportunidades(
      ventana([una('a', sello(50)), una('b', sello(40))]),
      pagina([una('b', sello(40)), una('c', sello(30)), una('d', sello(20))], true),
      new Set(['c']),
    )
    expect(ids(suma.lista)).toEqual(['a', 'b', 'd'])
    expect(suma.hayMas).toBe(true)
  })

  it('lo que se puso mientras tanto se queda en su lugar', () => {
    const suma = sumarPaginaDeOportunidades(
      ventana([una('n', sello(55)), una('a', sello(50))]),
      pagina([una('c', sello(30))], false),
      ninguna,
    )
    expect(ids(suma.lista)).toEqual(['n', 'a', 'c'])
  })

  it('corta en el tope y deja «hay más»', () => {
    const llena = Array.from({ length: TOPE_DE_LO_CARGADO - 1 }, (_, i) =>
      una(`o${String(1000 + i)}`, sello(59, `.${String(999999 - i)}`)),
    )
    const suma = sumarPaginaDeOportunidades(
      ventana(llena),
      pagina([una('x1', sello(1)), una('x2', sello(2))], false),
      ninguna,
    )
    expect(suma.lista).toHaveLength(TOPE_DE_LO_CARGADO)
    expect(suma.hayMas).toBe(true)
  })
})

describe('caminoAlEmbudo', () => {
  it('lleva al kanban del embudo, buscando por el nombre del lead', () => {
    expect(caminoAlEmbudo('m1', 'Ana Pérez')).toBe('/leads?vista=embudo&embudo=m1&q=Ana+P%C3%A9rez')
  })

  it('con un nombre de una letra no busca: sólo abre el embudo', () => {
    expect(caminoAlEmbudo('m1', 'A')).toBe('/leads?vista=embudo&embudo=m1')
    expect(caminoAlEmbudo('m1', '  ')).toBe('/leads?vista=embudo&embudo=m1')
  })

  it('escapa un & o un # del nombre y lo corta en los 60 de la base', () => {
    expect(caminoAlEmbudo('m1', 'Pérez & Hijos #2')).toBe(
      '/leads?vista=embudo&embudo=m1&q=P%C3%A9rez+%26+Hijos+%232',
    )
    const largo = caminoAlEmbudo('m1', 'x'.repeat(100))
    expect(new URL(largo, 'http://x').searchParams.get('q')).toBe('x'.repeat(60))
  })
})
