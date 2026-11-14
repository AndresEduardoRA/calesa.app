import { describe, expect, it } from 'vitest'
import {
  hayAcciones,
  hrefDePanel,
  MAXIMO_DE_ACCIONES,
  pedidoDe,
  resolverAcciones,
  SIN_ACCIONES,
  type AccionDelAviso,
  type OfertaDeAccion,
} from './acciones-del-aviso'

const ir = (etiqueta: string): AccionDelAviso => ({ tipo: 'ir', etiqueta, ruta: `/${etiqueta}` })
const oferta = (etiqueta: string, puede = true, pedido?: string): OfertaDeAccion => ({
  accion: ir(etiqueta),
  puede,
  ...(pedido === undefined ? {} : { pedido }),
})

describe('resolverAcciones', () => {
  it('conserva el orden: la principal va primero', () => {
    const { acciones } = resolverAcciones([oferta('Quitar'), oferta('Ver'), oferta('Otra')])
    expect(acciones.map((a) => a.etiqueta)).toEqual(['Quitar', 'Ver', 'Otra'])
  })

  it('ofrece 3 como máximo', () => {
    const ofertas = ['a', 'b', 'c', 'd', 'e'].map((e) => oferta(e))
    const { acciones } = resolverAcciones(ofertas)
    expect(acciones).toHaveLength(MAXIMO_DE_ACCIONES)
    expect(acciones.map((a) => a.etiqueta)).toEqual(['a', 'b', 'c'])
  })

  it('no ofrece lo que quien mira no puede, y las demás conservan su lugar', () => {
    const { acciones } = resolverAcciones([oferta('a', false), oferta('b'), oferta('c', false)])
    expect(acciones.map((a) => a.etiqueta)).toEqual(['b'])
  })

  it('el pedido sale de la acción que resuelve y no de la que sólo informa', () => {
    const resueltas = resolverAcciones([
      oferta('Quitar', false, pedidoDe('quitar el vínculo')),
      oferta('Ver el lead', false),
    ])
    expect(resueltas.acciones).toEqual([])
    expect(resueltas.pedido).toBe('Para quitar el vínculo, pídeselo a quien administra los roles.')
  })

  it('el pedido es uno solo, aunque haya varias sin permiso', () => {
    const { pedido } = resolverAcciones([
      oferta('a', false, pedidoDe('hacer a')),
      oferta('b', false, pedidoDe('hacer b')),
    ])
    expect(pedido).toBe(pedidoDe('hacer a'))
  })

  it('con permiso no hay pedido, aunque la oferta lo traiga', () => {
    expect(resolverAcciones([oferta('a', true, pedidoDe('hacer a'))]).pedido).toBeNull()
  })

  it('sin ofertas no hay nada que dibujar', () => {
    expect(resolverAcciones([])).toEqual(SIN_ACCIONES)
    expect(hayAcciones(SIN_ACCIONES)).toBe(false)
    expect(hayAcciones({ acciones: [], pedido: 'x' })).toBe(true)
  })
})

describe('hrefDePanel', () => {
  const abrir = { tipo: 'panel', etiqueta: 'Abrir', panel: 'desvincular' } as const

  it('abre el panel sobre la ruta y conserva los parámetros de hoy', () => {
    expect(hrefDePanel(abrir, '/vehiculos/1', '?seccion=ficha&origen=x')).toBe(
      '/vehiculos/1?seccion=ficha&origen=x&panel=desvincular',
    )
  })

  it('reemplaza un panel abierto y suma sus valores', () => {
    expect(
      hrefDePanel({ ...abrir, valores: { luego: 'papelera' } }, '/vehiculos/1', '?panel=otro'),
    ).toBe('/vehiculos/1?panel=desvincular&luego=papelera')
  })

  it('sin parámetros de hoy sólo lleva el panel', () => {
    expect(hrefDePanel(abrir, '/x', '')).toBe('/x?panel=desvincular')
  })
})
