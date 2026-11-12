import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import { cadenaFiltrada, esquemaDeFiltrosDeLaCadena, pedidoDeLaCadena } from './filtros'

const NAVIERA = '11111111-1111-4111-8111-111111111111'
const esquema = esquemaDeFiltrosDeLaCadena({ navieras: [{ id: NAVIERA, nombre: 'Maersk' }] })
const pedido = (url: Record<string, string>) => pedidoDeLaCadena(leerFiltros(esquema, url))

describe('pedidoDeLaCadena', () => {
  it('sin nada en la URL no pide ningún filtro', () => {
    expect(pedido({})).toEqual({})
    expect(cadenaFiltrada(pedido({}))).toBe(false)
  })

  it('«demoradas=si» filtra y la ausencia no deja ni la clave', () => {
    expect(pedido({ demoradas: 'si' })).toEqual({ demoradas: true })
    expect(Object.keys(pedido({ demoradas: 'todas' }))).toEqual([])
    expect(pedido({ por_aprobar: 'si' })).toEqual({ por_aprobar: true })
  })

  it('un valor de elección que no se ofrece se descarta («quizá», «no»)', () => {
    expect(pedido({ demoradas: 'quizá', por_aprobar: 'no' })).toEqual({})
  })

  it('una búsqueda corta no se manda; una que alcanza, sí y recortada', () => {
    expect(pedido({ q: 'ab' })).toEqual({})
    expect(pedido({ q: '  ab  ' })).toEqual({})
    expect(pedido({ q: ' 1HGCM82633A004352 ' })).toEqual({ q: '1HGCM82633A004352' })
  })

  it('contenedor y booking van recortados y los vacíos quedan fuera', () => {
    expect(pedido({ contenedor: '  MSKU123  ', booking: '   ' })).toEqual({ contenedor: 'MSKU123' })
    expect(cadenaFiltrada(pedido({ booking: 'BK-9' }))).toBe(true)
  })

  it('«naviera» sólo si es una de las ofrecidas o al menos un guid', () => {
    expect(pedido({ naviera: NAVIERA })).toEqual({ naviera: NAVIERA })
    expect(pedido({ naviera: 'no-es-un-guid' })).toEqual({})
    expect(pedido({ naviera: 'todas' })).toEqual({})
  })

  it('sin navieras, el esquema no ofrece el filtro y la URL no lo produce', () => {
    const sinNavieras = esquemaDeFiltrosDeLaCadena({ navieras: [] })
    expect(sinNavieras.filtros.some((f) => f.clave === 'naviera')).toBe(false)
    expect(pedidoDeLaCadena(leerFiltros(sinNavieras, { naviera: NAVIERA }))).toEqual({})
  })

  it('los filtros ajenos de la URL (origen, fase, vehiculo) no entran al pedido', () => {
    expect(pedido({ origen: NAVIERA, fase: 'sin_fase', vehiculo: NAVIERA })).toEqual({})
  })

  it('lo que sale es lo que la RPC acepta, y nada más', () => {
    const todo = pedido({
      q: 'toyota',
      demoradas: 'si',
      por_aprobar: 'si',
      contenedor: 'MSKU',
      booking: 'BK',
      naviera: NAVIERA,
    })
    expect(Object.keys(todo).sort()).toEqual(
      ['booking', 'contenedor', 'demoradas', 'naviera', 'por_aprobar', 'q'].sort(),
    )
  })
})
