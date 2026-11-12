import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import { esquemaDeFiltrosDeGrupos, gruposFiltrados, pedidoDeGrupos } from './filtros'
import type { VistaDeGrupos } from './paneles'

const NAVIERA = '11111111-1111-4111-8111-111111111111'
const ORIGEN = '22222222-2222-4222-8222-222222222222'
const DESTINO = '33333333-3333-4333-8333-333333333333'
const CURSOR = '44444444-4444-4444-8444-444444444444'

const catalogos = {
  navieras: [{ id: NAVIERA, nombre: 'Maersk', activo: true }],
  puertos: [
    { id: ORIGEN, nombre: 'Miami', activo: true },
    { id: DESTINO, nombre: 'Iquique', activo: true },
  ],
}

const pedido = (
  url: Record<string, string>,
  { vista = 'embarques', desde = null }: { vista?: VistaDeGrupos; desde?: string | null } = {},
) => pedidoDeGrupos(leerFiltros(esquemaDeFiltrosDeGrupos(vista, catalogos), url), { vista, desde })

describe('lo que la URL pide a la base', () => {
  it('sin nada en la URL no filtra y la vista fija el tipo', () => {
    expect(pedido({})).toEqual({ tipo: 'booking', filtros: {}, desde: null })
    expect(pedido({}, { vista: 'contenedores' }).tipo).toBe('contenedor')
    expect(gruposFiltrados(pedido({}).filtros)).toBe(false)
  })

  it('manda sólo las claves de la RPC', () => {
    const filtros = pedido({
      naviera: NAVIERA,
      puerto_origen: ORIGEN,
      puerto_destino: DESTINO,
      en_transito: 'si',
      q: 'ecm',
    }).filtros
    expect(filtros).toEqual({
      naviera: NAVIERA,
      puerto_origen: ORIGEN,
      puerto_destino: DESTINO,
      en_transito: true,
      prefijo: 'ecm',
    })
    expect(gruposFiltrados(filtros)).toBe(true)
  })

  it('«no» manda falso y «todos» no manda nada', () => {
    expect(pedido({ en_transito: 'no' }).filtros).toEqual({ en_transito: false })
    expect(pedido({ en_transito: 'todos' }).filtros).toEqual({})
    expect(pedido({ en_transito: 'quizá' }).filtros).toEqual({})
  })

  it('el prefijo conserva el texto tal cual (la base lo normaliza)', () => {
    expect(pedido({ q: 'ecmu 12' }).filtros).toEqual({ prefijo: 'ecmu 12' })
  })

  it('una búsqueda sin tres letras o números seguidos no filtra', () => {
    expect(pedido({ q: 'ab' }).filtros).toEqual({})
    expect(pedido({ q: 'ab-c' }).filtros).toEqual({})
    expect(pedido({ q: '  ' }).filtros).toEqual({})
  })

  it('un id que no es un uuid se descarta', () => {
    expect(pedido({ naviera: 'no-es-un-uuid' }).filtros).toEqual({})
  })

  it('el cursor es un uuid pelado; otra cosa es la primera página', () => {
    expect(pedido({}, { desde: CURSOR }).desde).toBe(CURSOR)
    expect(pedido({}, { desde: 'MjAyNnx4' }).desde).toBeNull()
  })
})

describe('el esquema', () => {
  it('la búsqueda se llama según la vista', () => {
    expect(esquemaDeFiltrosDeGrupos('embarques', catalogos).busqueda?.etiqueta).toBe(
      'Buscar por booking',
    )
    expect(esquemaDeFiltrosDeGrupos('contenedores', catalogos).busqueda?.etiqueta).toBe(
      'Buscar por contenedor',
    )
  })

  it('sin navieras ni puertos activos, esos filtros no se dibujan', () => {
    const sin = esquemaDeFiltrosDeGrupos('embarques', {
      navieras: [{ id: NAVIERA, nombre: 'Vieja', activo: false }],
      puertos: [],
    })
    expect(sin.filtros.map((f) => f.clave)).toEqual(['en_transito'])
  })
})
