import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import { codificarCursor, leerCursor, type Cursor } from '@/shared/lib/paginacion'
import { CANALES_DE_AFORO } from './declaracion'
import { aduanaFiltrada, esquemaDeFiltrosDeAduana, paginaDeAduana, pedidoDeAduana } from './filtros'

const ID = '44444444-4444-4444-8444-444444444444'

const pedido = (url: Record<string, string>, cursor: Cursor | null = null) =>
  pedidoDeAduana(leerFiltros(esquemaDeFiltrosDeAduana(), url), { cursor })

describe('lo que la URL pide a la base', () => {
  it('sin nada en la URL no filtra', () => {
    expect(pedido({}).filtros).toEqual({})
    expect(aduanaFiltrada(pedido({}).filtros)).toBe(false)
  })

  it('manda sólo las claves de la RPC: canal, pagada y q', () => {
    const filtros = pedido({ canal: 'rojo', pagada: 'si', q: 'DUI-2026' }).filtros
    expect(filtros).toEqual({ canal: 'rojo', pagada: true, q: 'DUI-2026' })
    expect(aduanaFiltrada(filtros)).toBe(true)
  })

  it('«no» pagada manda falso y «todas» no manda nada', () => {
    expect(pedido({ pagada: 'no' }).filtros).toEqual({ pagada: false })
    expect(pedido({ pagada: 'todos' }).filtros).toEqual({})
  })

  it('una búsqueda corta no filtra', () => {
    expect(pedido({ q: 'ab' }).filtros).toEqual({})
    expect(pedido({ q: '  ' }).filtros).toEqual({})
  })

  it('un canal que no existe se descarta', () => {
    expect(pedido({ canal: 'azul' }).filtros).toEqual({})
  })

  it('el selector de canal ofrece los de la base', () => {
    const canal = esquemaDeFiltrosDeAduana().filtros.find((f) => f.clave === 'canal')
    expect(canal?.tipo === 'eleccion' && canal.opciones.map((o) => o.valor)).toEqual([
      'todos',
      ...CANALES_DE_AFORO,
    ])
  })

  it('el cursor hacia adelante llega con su instante y su id; hacia atrás se descarta', () => {
    const instante = '2026-11-10T10:00:00.123456+00:00'
    const adelante = leerCursor(codificarCursor({ instante, id: ID, sentido: 'siguiente' }))
    expect(pedido({}, adelante).cursor).toEqual({ desde: instante, id: ID })
    const atras = leerCursor(codificarCursor({ instante, id: ID, sentido: 'anterior' }))
    expect(pedido({}, atras).cursor).toBeNull()
  })
})

describe('la página', () => {
  const fila = (n: number) => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    creadoEn: `2026-11-10T10:00:${String(n).padStart(2, '0')}Z`,
  })

  it('con una fila de más hay siguiente y nunca anterior', () => {
    const leidas = Array.from({ length: 51 }, (_, i) => fila(i))
    const pagina = paginaDeAduana(leidas)
    expect(pagina.filas).toHaveLength(50)
    expect(pagina.siguiente).not.toBeNull()
    expect(pagina.anterior).toBeNull()
  })

  it('sin fila de más no hay siguiente', () => {
    expect(paginaDeAduana([fila(1), fila(2)]).siguiente).toBeNull()
  })
})
