import { describe, expect, it } from 'vitest'
import {
  ubicacionDeLaPagina,
  armarPagina,
  armarPaginaPor,
  codificarCursor,
  enElTope,
  leerCursor,
  CLAVE_DE_PREFERENCIA_POR_PAGINA,
  TAMANOS_DE_PAGINA,
  TAMANO_DE_COLUMNA,
  TAMANO_DE_PAGINA_POR_DEFECTO,
  TAMANO_DE_VER_MAS,
  esTamanoDePagina,
  leerPorPagina,
  tamanoDePagina,
  tamanosHasta,
  TOPE_DE_LO_CARGADO,
  type Cursor,
} from './paginacion'

const fila = (n: number) => ({
  id: `00000000-0000-4000-8000-00000000000${String(n)}`,
  creadoEn: `2026-10-13T12:00:0${String(n)}.123456+00:00`,
})
// El cursor que apunta a la fila n: su instante es el de la columna que ordena (acá, `creado_en`).
const cur = (n: number, sentido: Cursor['sentido']): Cursor => ({
  instante: fila(n).creadoEn,
  id: fila(n).id,
  sentido,
})

describe('cursor', () => {
  it('va y vuelve sin perder los microsegundos', () => {
    const cursor: Cursor = cur(3, 'siguiente')
    const texto = codificarCursor(cursor)
    expect(texto).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(leerCursor(texto)).toEqual(cursor)
    expect(leerCursor(codificarCursor(cur(3, 'anterior')))?.sentido).toBe('anterior')
  })

  it('uno ilegible es la primera página', () => {
    expect(leerCursor(null)).toBeNull()
    expect(leerCursor('')).toBeNull()
    expect(leerCursor('no es base64 !!')).toBeNull()
    expect(leerCursor(btoa('s|ayer|no-es-un-id'))).toBeNull()
    expect(leerCursor(btoa(`x|${fila(1).creadoEn}|${fila(1).id}`))).toBeNull()
    expect(leerCursor(btoa(`s|${fila(1).creadoEn}|${fila(1).id}|de más`))).toBeNull()
    expect(leerCursor(btoa(`s|${fila(1).creadoEn}'; drop table|${fila(1).id}`))).toBeNull()
  })
})

describe('armarPagina', () => {
  it('la primera página sin más filas no ofrece nada', () => {
    const pagina = armarPagina([fila(3), fila(2)], 2, null)
    expect(pagina.filas).toHaveLength(2)
    expect(pagina.siguiente).toBeNull()
    expect(pagina.anterior).toBeNull()
  })

  it('la fila de más dice que hay siguiente, y no se muestra', () => {
    const pagina = armarPagina([fila(3), fila(2), fila(1)], 2, null)
    expect(pagina.filas.map((una) => una.id)).toEqual([fila(3).id, fila(2).id])
    expect(leerCursor(pagina.siguiente)).toEqual(cur(2, 'siguiente'))
    expect(pagina.anterior).toBeNull()
  })

  it('una página a la que se llegó con cursor ofrece volver', () => {
    const pagina = armarPagina([fila(1)], 2, cur(2, 'siguiente'))
    expect(pagina.siguiente).toBeNull()
    expect(leerCursor(pagina.anterior)).toEqual(cur(1, 'anterior'))
  })

  it('hacia atrás llega al revés: se da vuelta y siempre se puede seguir', () => {
    // La consulta caminó de la más vieja a la más nueva: 2, 3 y una de más (4).
    const pagina = armarPagina([fila(2), fila(3), fila(4)], 2, cur(1, 'anterior'))
    expect(pagina.filas.map((una) => una.id)).toEqual([fila(3).id, fila(2).id])
    expect(leerCursor(pagina.siguiente)).toEqual(cur(2, 'siguiente'))
    expect(leerCursor(pagina.anterior)).toEqual(cur(3, 'anterior'))
  })

  it('hacia atrás sin fila de más es el principio', () => {
    const pagina = armarPagina([fila(2), fila(3)], 2, cur(1, 'anterior'))
    expect(pagina.anterior).toBeNull()
    expect(pagina.siguiente).not.toBeNull()
  })

  it('sin filas no hay página', () => {
    expect(armarPagina([], 2, cur(1, 'siguiente'))).toEqual({
      filas: [],
      siguiente: null,
      anterior: null,
    })
  })
})

describe('armarPaginaPor: el cursor por otra columna', () => {
  // Una fila del panel del vehículo: se pagina por `cotizadoEn`, no por cuándo se creó.
  const cotizada = (n: number) => ({
    id: `00000000-0000-4000-8000-00000000000${String(n)}`,
    creadoEn: '2020-01-01T00:00:00Z',
    cotizadoEn: `2026-10-29T08:0${String(n)}:00.5+00:00`,
  })

  it('el cursor lleva el instante de la columna que ordena, ida y vuelta', () => {
    const pagina = armarPaginaPor(
      [cotizada(3), cotizada(2), cotizada(1)],
      2,
      null,
      (una) => una.cotizadoEn,
    )
    expect(pagina.filas.map((una) => una.id)).toEqual([cotizada(3).id, cotizada(2).id])
    expect(leerCursor(pagina.siguiente)).toEqual({
      instante: cotizada(2).cotizadoEn,
      id: cotizada(2).id,
      sentido: 'siguiente',
    })
    // Hacia atrás desde la 1: la consulta caminó al revés (2, 3) y no trajo una de más.
    const desdeLaUno: Cursor = {
      instante: cotizada(1).cotizadoEn,
      id: cotizada(1).id,
      sentido: 'anterior',
    }
    const atras = armarPaginaPor([cotizada(2), cotizada(3)], 2, desdeLaUno, (una) => una.cotizadoEn)
    expect(atras.filas.map((una) => una.id)).toEqual([cotizada(3).id, cotizada(2).id])
    expect(atras.anterior).toBeNull()
    expect(leerCursor(atras.siguiente)).toEqual({
      instante: cotizada(2).cotizadoEn,
      id: cotizada(2).id,
      sentido: 'siguiente',
    })
  })

  it('armarPagina sigue paginando por creadoEn', () => {
    const pagina = armarPagina([fila(3), fila(2), fila(1)], 2, null)
    expect(leerCursor(pagina.siguiente)).toEqual(cur(2, 'siguiente'))
  })

  it('la codificación no cambia: un cursor escrito antes del renombre se lee igual', () => {
    expect(
      leerCursor(
        'c3wyMDI2LTEwLTEzVDEyOjAwOjAzLjEyMzQ1NiswMDowMHwwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDM',
      ),
    ).toEqual(cur(3, 'siguiente'))
    expect(codificarCursor(cur(3, 'siguiente'))).toBe(
      'c3wyMDI2LTEwLTEzVDEyOjAwOjAzLjEyMzQ1NiswMDowMHwwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDM',
    )
  })
})

describe('las listas con «Ver más»', () => {
  it('el tope cae justo en una página y no la deja crecer para siempre', () => {
    expect(TAMANO_DE_VER_MAS).toBeGreaterThan(0)
    expect(TOPE_DE_LO_CARGADO % TAMANO_DE_VER_MAS).toBe(0)
    expect(TOPE_DE_LO_CARGADO / TAMANO_DE_VER_MAS).toBeLessThanOrEqual(25)
  })

  it('enElTope llega justo al tope', () => {
    expect(enElTope(Array.from({ length: TOPE_DE_LO_CARGADO - 1 }))).toBe(false)
    expect(enElTope(Array.from({ length: TOPE_DE_LO_CARGADO }))).toBe(true)
  })
})

describe('el tamaño de página que elige la persona', () => {
  it('los tamaños son los cuatro del selector, de menor a mayor, y el de fábrica es uno de ellos', () => {
    expect([...TAMANOS_DE_PAGINA]).toEqual([10, 25, 50, 100])
    expect(esTamanoDePagina(TAMANO_DE_PAGINA_POR_DEFECTO)).toBe(true)
    expect(CLAVE_DE_PREFERENCIA_POR_PAGINA).toBe('listas.por_pagina')
  })

  it('el tamaño de una columna del kanban cabe en una página del selector', () => {
    expect(esTamanoDePagina(TAMANO_DE_COLUMNA)).toBe(true)
  })

  it('esTamanoDePagina sólo acepta un número de la lista', () => {
    for (const bueno of [10, 25, 50, 100]) expect(esTamanoDePagina(bueno)).toBe(true)
    for (const malo of [7, 0, -10, 101, 1000, 25.5, '50', null, undefined, NaN, Infinity]) {
      expect(esTamanoDePagina(malo)).toBe(false)
    }
  })

  it('?por= sólo vale con uno de los cuatro tamaños, escrito como entero', () => {
    expect(leerPorPagina('25')).toBe(25)
    expect(leerPorPagina('100')).toBe(100)
    for (const malo of [
      '7',
      '100000',
      '-5',
      'abc',
      '',
      ' 25',
      '25 ',
      '025',
      '2.5',
      '25;10',
      '1e2',
      '0x19',
      null,
      undefined,
    ]) {
      expect(leerPorPagina(malo)).toBeNull()
    }
  })

  it('manda lo que pide la URL; si no sirve, lo que eligió la persona; si no, el de fábrica', () => {
    expect(tamanoDePagina({ pedido: 25, preferencia: 100, maximo: 100 })).toBe(25)
    expect(tamanoDePagina({ pedido: null, preferencia: 100, maximo: 100 })).toBe(100)
    expect(tamanoDePagina({ pedido: 7, preferencia: 10, maximo: 100 })).toBe(10)
    expect(tamanoDePagina({ pedido: null, preferencia: null, maximo: 100 })).toBe(50)
    expect(tamanoDePagina({ preferencia: 33, maximo: 100 })).toBe(50)
    expect(tamanoDePagina({ maximo: 100 })).toBe(50)
  })

  it('nunca pasa del máximo de la lista', () => {
    expect(tamanoDePagina({ pedido: 100, maximo: 50 })).toBe(50)
    expect(tamanoDePagina({ preferencia: 100, maximo: 25 })).toBe(25)
    expect(tamanoDePagina({ maximo: 25 })).toBe(25)
    expect(tamanoDePagina({ pedido: 10, maximo: 25 })).toBe(10)
  })

  it('ofrece los tamaños hasta el máximo de la lista', () => {
    expect(tamanosHasta(100)).toEqual([10, 25, 50, 100])
    expect(tamanosHasta(50)).toEqual([10, 25, 50])
    expect(tamanosHasta(30)).toEqual([10, 25])
    expect(tamanosHasta(5)).toEqual([])
  })
})

describe('ubicacionDeLaPagina', () => {
  const fila = (creadoEn: string) => ({ id: creadoEn, creadoEn })
  it('sin página anterior, la lista está en lo más reciente', () => {
    expect(
      ubicacionDeLaPagina({
        filas: [fila('2026-10-17T10:00:00Z')],
        siguiente: 'x',
        anterior: null,
      }),
    ).toEqual({ tipo: 'principio' })
  })

  it('con página anterior, la fecha de la primera fila que se ve', () => {
    expect(
      ubicacionDeLaPagina({
        filas: [fila('2026-09-02T10:00:00Z'), fila('2026-09-01T10:00:00Z')],
        siguiente: null,
        anterior: 'y',
      }),
    ).toEqual({ tipo: 'hasta', creadoEn: '2026-09-02T10:00:00Z' })
  })

  it('sin filas no dice nada', () => {
    expect(ubicacionDeLaPagina({ filas: [], siguiente: null, anterior: 'y' })).toBeNull()
  })
})
