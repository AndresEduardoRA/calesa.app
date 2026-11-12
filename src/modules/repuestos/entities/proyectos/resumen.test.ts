import { describe, expect, it } from 'vitest'
import { ofertaDelResumen, resumirItems, type ItemDelResumen } from './resumen'

const fase = (id: string, nombre: string, orden: number, esFinal = false) => ({
  id,
  nombre,
  color: '#123456',
  esFinal,
  orden,
})
const PEDIDO = fase('a1111111-1111-4111-8111-111111111111', 'Pedido', 1)
const RECIBIDO = fase('b2222222-2222-4222-8222-222222222222', 'Recibido', 2, true)
const item = (f: ItemDelResumen['fase'], enStock = false): ItemDelResumen => ({ fase: f, enStock })

describe('resumirItems', () => {
  it('agrupa por fase en el orden de la fase y deja «Sin fase» al final', () => {
    const r = resumirItems([item(null), item(RECIBIDO), item(PEDIDO), item(RECIBIDO)], null)
    expect(r.grupos.map((g) => [g.nombre, g.n])).toEqual([
      ['Pedido', 1],
      ['Recibido', 2],
      ['Sin fase', 1],
    ])
    expect(r.total).toEqual({ n: 4, hayMas: false })
  })

  it('con 201 ítems el total es «más de 200» y ningún grupo cuenta el 201', () => {
    const leidos = Array.from({ length: 201 }, () => item(PEDIDO))
    const r = resumirItems(leidos, null)
    expect(r.total).toEqual({ n: 200, hayMas: true })
    expect(r.grupos).toHaveLength(1)
    expect(r.grupos[0]?.n).toBe(200)
  })

  it('el estado sale de los pendientes: sin ítems, en curso, completo y cerrado', () => {
    expect(resumirItems([], null).estado).toBe('sin_items')
    expect(resumirItems([item(PEDIDO)], null).estado).toBe('en_curso')
    expect(resumirItems([item(RECIBIDO), item(PEDIDO, true)], null).estado).toBe('completo')
    expect(resumirItems([item(PEDIDO)], '2026-11-12T10:00:00Z').estado).toBe('cerrado')
  })
})

describe('ofertaDelResumen', () => {
  const proyecto = {
    id: 'c3333333-3333-4333-8333-333333333333',
    numero: 12,
    cerradoEn: null,
    actualizadoEn: 'x',
  }

  it('con proyecto, abrirlo; con o sin permiso de editar', () => {
    expect(ofertaDelResumen({ proyecto, puedeCrear: false })).toBe('abrir')
    expect(ofertaDelResumen({ proyecto, puedeCrear: true })).toBe('abrir')
  })

  it('sin proyecto, crear sólo con repuestos.editar', () => {
    expect(ofertaDelResumen({ proyecto: null, puedeCrear: true })).toBe('crear')
    expect(ofertaDelResumen({ proyecto: null, puedeCrear: false })).toBe('ninguna')
  })
})
