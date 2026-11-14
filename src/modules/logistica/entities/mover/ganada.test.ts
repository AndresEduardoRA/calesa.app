import { describe, expect, it } from 'vitest'
import {
  destinosParaGanar,
  estadoDelModoGanada,
  PRIMERO_LA_INICIAL,
  SIN_DESTINOS_PARA_GANAR,
  vistaDelHueco,
  YA_NO_SIN_RESOLVER,
} from './ganada'

const destino = (faseId: string, esSubasta: boolean) => ({ faseId, esSubasta })

describe('«La ganamos»', () => {
  it('ofrece sólo lo que no es la subasta, en su orden', () => {
    expect(
      destinosParaGanar([destino('a', true), destino('b', false), destino('c', false)]),
    ).toEqual([destino('b', false), destino('c', false)])
  })

  it('sin resolver: la lista filtrada con la primera abierta', () => {
    expect(
      estadoDelModoGanada({
        situacion: 'sin_resolver',
        faseActualId: 'f',
        destinos: [destino('a', true), destino('b', false)],
      }),
    ).toEqual({ tipo: 'listo', destinos: [destino('b', false)], abierto: 'b' })
  })

  it('sin destinos fuera de la subasta: con fase, no hay después; sin fase, primero la inicial', () => {
    expect(
      estadoDelModoGanada({ situacion: 'sin_resolver', faseActualId: 'f', destinos: [] }),
    ).toEqual({ tipo: 'sin_destinos', texto: SIN_DESTINOS_PARA_GANAR })
    expect(
      estadoDelModoGanada({
        situacion: 'sin_resolver',
        faseActualId: null,
        destinos: [destino('a', true)],
      }),
    ).toEqual({ tipo: 'sin_destinos', texto: PRIMERO_LA_INICIAL })
  })

  it('si ya no está sin resolver, lo dice', () => {
    for (const situacion of ['en_subasta', 'no_ganada', 'fase'] as const) {
      expect(
        estadoDelModoGanada({ situacion, faseActualId: 'f', destinos: [destino('b', false)] }),
      ).toEqual({ tipo: 'ya_no', texto: YA_NO_SIN_RESOLVER })
    }
  })
})

describe('vistaDelHueco', () => {
  const todos = [destino('a', true), destino('b', false)]

  it('fuera del modo o si ya no está sin resolver, la lista de siempre sin anotar', () => {
    expect(vistaDelHueco(null, todos)).toEqual({
      destinos: todos,
      abiertoPorDefecto: null,
      anotaGanada: false,
      diceSinDestinos: false,
    })
    expect(vistaDelHueco({ tipo: 'ya_no', texto: YA_NO_SIN_RESOLVER }, []).diceSinDestinos).toBe(
      true,
    )
  })

  it('en el modo, la filtrada con la primera abierta y anota; sin destinos, nada más que su texto', () => {
    expect(
      vistaDelHueco({ tipo: 'listo', destinos: [destino('b', false)], abierto: 'b' }, todos),
    ).toEqual({
      destinos: [destino('b', false)],
      abiertoPorDefecto: 'b',
      anotaGanada: true,
      diceSinDestinos: false,
    })
    expect(vistaDelHueco({ tipo: 'sin_destinos', texto: SIN_DESTINOS_PARA_GANAR }, todos)).toEqual({
      destinos: [],
      abiertoPorDefecto: null,
      anotaGanada: false,
      diceSinDestinos: false,
    })
  })
})
