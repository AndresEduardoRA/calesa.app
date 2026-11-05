import { describe, expect, it } from 'vitest'
import {
  difiereAlAbrir,
  hojaSinAbierta,
  muestraElTotalGuardado,
  type LoGuardado,
} from './hoja-de-una-guardada'
import { hojaDeUnaGuardadaDesde } from './hoja-de-una-guardada-lectura'
import { crudaDeUnaGuardada } from './hoja-de-una-guardada.soporte'
import { respuestaDePrueba } from './hoja-de-prueba.soporte'

describe('hojaSinAbierta: el diseño de una guardada como la hoja que dibuja HojaDeCotizar', () => {
  it('es una hoja lista sin hoja abierta ni hora, y el vehículo no es obligatorio', () => {
    const h = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada())
    if (!h) {
      throw new Error('No se leyó.')
    }
    const hoja = hojaSinAbierta(h.diseno)
    expect(hoja.estado).toBe('lista')
    expect(hoja.abierta).toBe('')
    expect(hoja.abiertaEn).toBe('')
    expect(hoja.vehiculoObligatorio).toBe(false)
    expect(hoja.secciones).toBe(h.diseno.secciones)
  })
})

const guardado = (
  valores: Record<string, number | string | null>,
  totalUsd: number | null = 100,
): LoGuardado => ({ valores: new Map(Object.entries(valores)), fuentes: new Map(), totalUsd })

describe('difiereAlAbrir: lo de hoy no es lo guardado', () => {
  it('igual: no difiere', () => {
    expect(
      difiereAlAbrir(
        guardado({ a: 1, b: 'x', c: null }),
        respuestaDePrueba({ valores: { a: 1, b: 'x', c: null }, usd: 100 }),
      ),
    ).toBe(false)
  })

  it('el total de hoy es otro: difiere', () => {
    expect(
      difiereAlAbrir(guardado({ a: 1 }), respuestaDePrueba({ valores: { a: 1 }, usd: 101 })),
    ).toBe(true)
  })

  it('una celda distinta con el mismo total: difiere (se miran los valores, no sólo el total)', () => {
    expect(
      difiereAlAbrir(
        guardado({ a: 1, b: 2 }),
        respuestaDePrueba({ valores: { a: 1, b: 3 }, usd: 100 }),
      ),
    ).toBe(true)
  })

  it('una clave de más o de menos: difiere', () => {
    expect(
      difiereAlAbrir(guardado({ a: 1 }), respuestaDePrueba({ valores: { a: 1, b: 2 }, usd: 100 })),
    ).toBe(true)
    expect(
      difiereAlAbrir(guardado({ a: 1, b: 2 }), respuestaDePrueba({ valores: { a: 1 }, usd: 100 })),
    ).toBe(true)
  })

  it('un número y un texto o un nulo no son lo mismo', () => {
    expect(
      difiereAlAbrir(guardado({ a: 1 }), respuestaDePrueba({ valores: { a: '1' }, usd: 100 })),
    ).toBe(true)
    expect(
      difiereAlAbrir(guardado({ a: 0 }), respuestaDePrueba({ valores: { a: null }, usd: 100 })),
    ).toBe(true)
  })

  it('un total nulo contra uno con número difiere; dos nulos, no', () => {
    expect(difiereAlAbrir(guardado({}, null), respuestaDePrueba({ usd: 100 }))).toBe(true)
    expect(difiereAlAbrir(guardado({}, 100), respuestaDePrueba({ usd: null }))).toBe(true)
    expect(difiereAlAbrir(guardado({}, null), respuestaDePrueba({ usd: null }))).toBe(false)
  })

  it('si el recálculo falló no hay con qué comparar: no difiere', () => {
    expect(difiereAlAbrir(guardado({ a: 1 }), null)).toBe(false)
  })
})

describe('muestraElTotalGuardado: cuándo se dice el total de antes', () => {
  it('si el recálculo falló se ve igual (también quien no ve el vehículo)', () => {
    expect(muestraElTotalGuardado(guardado({ a: 1 }), null)).toBe(true)
  })

  it('si el total de hoy es otro se ve; si es el mismo, no, aunque una celda cambie', () => {
    expect(
      muestraElTotalGuardado(
        guardado({ a: 1 }),
        respuestaDePrueba({ valores: { a: 1 }, usd: 101 }),
      ),
    ).toBe(true)
    expect(
      muestraElTotalGuardado(
        guardado({ a: 1 }),
        respuestaDePrueba({ valores: { a: 2 }, usd: 100 }),
      ),
    ).toBe(false)
    expect(
      muestraElTotalGuardado(
        guardado({ a: 1 }),
        respuestaDePrueba({ valores: { a: 1 }, usd: 100 }),
      ),
    ).toBe(false)
  })

  it('un total nulo contra uno con número se ve; dos nulos, no', () => {
    expect(muestraElTotalGuardado(guardado({}, null), respuestaDePrueba({ usd: 5 }))).toBe(true)
    expect(muestraElTotalGuardado(guardado({}, null), respuestaDePrueba({ usd: null }))).toBe(false)
  })
})
