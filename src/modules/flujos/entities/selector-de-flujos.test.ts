import { describe, expect, it } from 'vitest'
import type { FlujoConfigurable } from './flujo'
import { armarSelector, elegirEntrada, type OrigenDelSelector } from './selector-de-flujos'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const SUBASTA: OrigenDelSelector = {
  id: guid(1),
  nombre: 'Subasta',
  color: '#111111',
  activo: true,
}
const OFICINA: OrigenDelSelector = {
  id: guid(2),
  nombre: 'Oficina',
  color: '#222222',
  activo: false,
}
const AJENO: OrigenDelSelector = { id: guid(3), nombre: 'Ajeno', color: '#333333', activo: true }

const flujoDe = (
  n: number,
  origen: OrigenDelSelector | null,
  extra: Partial<FlujoConfigurable> = {},
): FlujoConfigurable => ({
  id: guid(100 + n),
  ambito: origen ? 'vehiculos' : 'repuestos',
  origenId: origen?.id ?? null,
  nombre: origen ? `Flujo ${String(n)}` : 'Repuestos',
  activo: true,
  ...extra,
})

describe('armarSelector', () => {
  it('pone los orígenes en el orden recibido y repuestos al final', () => {
    const entradas = armarSelector(
      [flujoDe(0, null), flujoDe(2, OFICINA), flujoDe(1, SUBASTA)],
      [SUBASTA, OFICINA],
    )
    expect(entradas.map((e) => e.titulo)).toEqual(['Subasta', 'Oficina (inactivo)', 'Repuestos'])
    expect(entradas.map((e) => e.clave)).toEqual([SUBASTA.id, OFICINA.id, 'repuestos'])
    expect(entradas[0]?.color).toBe('#111111')
    expect(entradas[2]?.color).toBeNull()
  })

  it('no ofrece un flujo cuyo origen no llegó en la lista', () => {
    const entradas = armarSelector([flujoDe(1, SUBASTA), flujoDe(3, AJENO)], [SUBASTA])
    expect(entradas.map((e) => e.clave)).toEqual([SUBASTA.id])
  })

  it('un origen sin flujo configurable no aparece', () => {
    expect(armarSelector([flujoDe(1, SUBASTA)], [SUBASTA, OFICINA])).toHaveLength(1)
  })

  it('el de repuestos lleva el nombre del flujo, no un texto fijo', () => {
    const [entrada] = armarSelector([flujoDe(0, null, { nombre: 'Flujo del taller' })], [])
    expect(entrada?.titulo).toBe('Flujo del taller')
  })
})

describe('elegirEntrada', () => {
  const entradas = armarSelector(
    [flujoDe(1, SUBASTA), flujoDe(2, OFICINA), flujoDe(0, null)],
    [SUBASTA, OFICINA],
  )

  it('?ambito=repuestos gana sobre ?origen=', () => {
    expect(elegirEntrada(entradas, { origen: OFICINA.id, ambito: 'repuestos' })?.clave).toBe(
      'repuestos',
    )
  })

  it('sin repuestos entre las entradas, ?ambito=repuestos cae a ?origen=', () => {
    const sinRepuestos = entradas.filter((e) => e.clave !== 'repuestos')
    expect(elegirEntrada(sinRepuestos, { origen: OFICINA.id, ambito: 'repuestos' })?.clave).toBe(
      OFICINA.id,
    )
  })

  it('abre el origen pedido si es de los suyos', () => {
    expect(elegirEntrada(entradas, { origen: OFICINA.id, ambito: null })?.clave).toBe(OFICINA.id)
  })

  it('un id inválido o ajeno abre el primero', () => {
    expect(elegirEntrada(entradas, { origen: 'basura', ambito: null })?.clave).toBe(SUBASTA.id)
    expect(elegirEntrada(entradas, { origen: AJENO.id, ambito: null })?.clave).toBe(SUBASTA.id)
    expect(elegirEntrada(entradas, { origen: null, ambito: 'otra-cosa' })?.clave).toBe(SUBASTA.id)
  })

  it('sin entradas da null', () => {
    expect(elegirEntrada([], { origen: SUBASTA.id, ambito: null })).toBeNull()
  })
})
