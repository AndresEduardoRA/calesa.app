import { describe, expect, it } from 'vitest'
import type { Nodo } from '../nodos'
import { conservar } from './conservar-de-la-fila'

const nodo = (resto: Record<string, unknown>): Nodo =>
  ({ id: 'x', etiqueta: 'X', ...resto }) as unknown as Nodo
const suma = (resto: Record<string, unknown> = {}) =>
  nodo({ tipo: 'calculo', op: 'suma', de: ['a', 'b'], ...resto })
const si = (resto: Record<string, unknown> = {}) =>
  nodo({ tipo: 'calculo', op: 'si', de: ['a'], condicion: 'b', ...resto })
const constante = (resto: Record<string, unknown> = {}) => nodo({ tipo: 'constante', ...resto })

describe('conservar (C5)', () => {
  it('una fila nueva sólo lleva el texto', () => {
    expect(conservar(suma(), null, '=a+b')).toEqual({ nodo: suma({ texto: '=a+b' }), soltados: [] })
  })

  it('lleva el texto y conserva seccion, color y sobrescribible de un cálculo', () => {
    const viejo = suma({ seccion: 'Costos', color: 'verde', sobrescribible: true })
    expect(conservar(suma(), viejo, '=a+b')).toEqual({
      nodo: suma({ texto: '=a+b', seccion: 'Costos', color: 'verde', sobrescribible: true }),
      soltados: [],
    })
  })

  it('una constante nueva suelta sobrescribible y lo dice; sobrescribible falso no se dice', () => {
    expect(conservar(constante(), suma({ sobrescribible: true }), '=4').soltados).toEqual([
      'sobrescribible',
    ])
    expect(conservar(constante(), suma({ sobrescribible: false }), '=4').soltados).toEqual([])
  })

  it('un interruptor pasa a un cálculo que no es SI y a una constante', () => {
    const viejo = suma({ condicion: 'c' })
    expect(conservar(suma({ op: 'restar' }), viejo, '=a-b').nodo).toMatchObject({ condicion: 'c' })
    expect(conservar(constante(), viejo, '=4').nodo).toMatchObject({ condicion: 'c' })
  })

  it('un SI nuevo lleva la bandera del texto y suelta el interruptor', () => {
    const r = conservar(si({ condicion: 'b' }), suma({ condicion: 'c' }), '=SI(b; a)')
    expect(r.nodo).toMatchObject({ condicion: 'b' })
    expect(r.soltados).toEqual(['condicion'])
  })

  it('la bandera de un SI viejo no pasa a ser interruptor y no es un soltado', () => {
    const r = conservar(suma(), si({ condicion: 'b' }), '=a+b')
    expect(r.nodo).not.toHaveProperty('condicion')
    expect(r.soltados).toEqual([])
  })

  it('un SI que sigue siendo SI deja la bandera del texto', () => {
    const r = conservar(si({ condicion: 'c' }), si({ condicion: 'b' }), '=SI(c; a)')
    expect(r.nodo).toMatchObject({ condicion: 'c' })
    expect(r.soltados).toEqual([])
  })

  it('de un input suelta lo que el texto no lleva (sugerido_de) y no dice lo de la operación', () => {
    const viejo = nodo({ tipo: 'input', sugerido_de: 'k', requerido_si: 'b' })
    expect(conservar(suma(), viejo, '=a+b').soltados).toEqual(['sugerido_de', 'requerido_si'])
  })

  it('no toca lo que recibe', () => {
    const raiz = suma()
    const viejo = suma({ seccion: 'Costos' })
    conservar(raiz, viejo, '=a+b')
    expect(raiz).toEqual(suma())
    expect(viejo).toEqual(suma({ seccion: 'Costos' }))
  })
})
