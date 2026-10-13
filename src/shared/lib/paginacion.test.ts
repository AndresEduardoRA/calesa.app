import { describe, expect, it } from 'vitest'
import { armarPagina, codificarCursor, leerCursor, type Cursor } from './paginacion'

const fila = (n: number) => ({
  id: `00000000-0000-4000-8000-00000000000${String(n)}`,
  creadoEn: `2026-10-13T12:00:0${String(n)}.123456+00:00`,
})

describe('cursor', () => {
  it('va y vuelve sin perder los microsegundos', () => {
    const cursor: Cursor = { ...fila(3), sentido: 'siguiente' }
    const texto = codificarCursor(cursor)
    expect(texto).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(leerCursor(texto)).toEqual(cursor)
    expect(leerCursor(codificarCursor({ ...fila(3), sentido: 'anterior' }))?.sentido).toBe(
      'anterior',
    )
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
    expect(leerCursor(pagina.siguiente)).toEqual({ ...fila(2), sentido: 'siguiente' })
    expect(pagina.anterior).toBeNull()
  })

  it('una página a la que se llegó con cursor ofrece volver', () => {
    const pagina = armarPagina([fila(1)], 2, { ...fila(2), sentido: 'siguiente' })
    expect(pagina.siguiente).toBeNull()
    expect(leerCursor(pagina.anterior)).toEqual({ ...fila(1), sentido: 'anterior' })
  })

  it('hacia atrás llega al revés: se da vuelta y siempre se puede seguir', () => {
    // La consulta caminó de la más vieja a la más nueva: 2, 3 y una de más (4).
    const pagina = armarPagina([fila(2), fila(3), fila(4)], 2, { ...fila(1), sentido: 'anterior' })
    expect(pagina.filas.map((una) => una.id)).toEqual([fila(3).id, fila(2).id])
    expect(leerCursor(pagina.siguiente)).toEqual({ ...fila(2), sentido: 'siguiente' })
    expect(leerCursor(pagina.anterior)).toEqual({ ...fila(3), sentido: 'anterior' })
  })

  it('hacia atrás sin fila de más es el principio', () => {
    const pagina = armarPagina([fila(2), fila(3)], 2, { ...fila(1), sentido: 'anterior' })
    expect(pagina.anterior).toBeNull()
    expect(pagina.siguiente).not.toBeNull()
  })

  it('sin filas no hay página', () => {
    expect(armarPagina([], 2, { ...fila(1), sentido: 'siguiente' })).toEqual({
      filas: [],
      siguiente: null,
      anterior: null,
    })
  })
})
