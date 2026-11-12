import { describe, expect, it } from 'vitest'
import {
  MOTIVO_YA_ES_LA_PRIMERA,
  MOTIVO_YA_ES_LA_ULTIMA,
  despuesDeAlMover,
  motivoSinMover,
} from './orden-de-fases'

const FASES = ['a', 'b', 'c', 'd'].map((id) => ({ id }))

describe('despuesDeAlMover', () => {
  it('subir: después de la que está dos arriba; la segunda queda primera', () => {
    expect(despuesDeAlMover(FASES, 'd', 'subir')).toEqual({ despuesDe: 'b' })
    expect(despuesDeAlMover(FASES, 'c', 'subir')).toEqual({ despuesDe: 'a' })
    expect(despuesDeAlMover(FASES, 'b', 'subir')).toEqual({ despuesDe: null })
  })

  it('bajar: después de la que está debajo', () => {
    expect(despuesDeAlMover(FASES, 'a', 'bajar')).toEqual({ despuesDe: 'b' })
    expect(despuesDeAlMover(FASES, 'c', 'bajar')).toEqual({ despuesDe: 'd' })
  })

  it('en los extremos no hay movimiento', () => {
    expect(despuesDeAlMover(FASES, 'a', 'subir')).toBeNull()
    expect(despuesDeAlMover(FASES, 'd', 'bajar')).toBeNull()
  })

  it('un id que no está, no se mueve', () => {
    expect(despuesDeAlMover(FASES, 'z', 'subir')).toBeNull()
    expect(despuesDeAlMover([], 'a', 'bajar')).toBeNull()
  })

  it('las jubiladas cuentan en el orden: la lista llega completa', () => {
    // «jubilada» está en medio y no se salta: la base renumera todas.
    const conJubilada = [{ id: 'a' }, { id: 'jubilada' }, { id: 'c' }]
    expect(despuesDeAlMover(conJubilada, 'c', 'subir')).toEqual({ despuesDe: 'a' })
    expect(despuesDeAlMover(conJubilada, 'a', 'bajar')).toEqual({ despuesDe: 'jubilada' })
  })

  it('una sola fase no se mueve', () => {
    expect(despuesDeAlMover([{ id: 'a' }], 'a', 'subir')).toBeNull()
    expect(despuesDeAlMover([{ id: 'a' }], 'a', 'bajar')).toBeNull()
  })
})

describe('motivoSinMover', () => {
  it('dice por qué el botón está apagado, o nulo', () => {
    expect(motivoSinMover(FASES, 'a', 'subir')).toBe(MOTIVO_YA_ES_LA_PRIMERA)
    expect(motivoSinMover(FASES, 'd', 'bajar')).toBe(MOTIVO_YA_ES_LA_ULTIMA)
    expect(motivoSinMover(FASES, 'b', 'subir')).toBeNull()
    expect(motivoSinMover(FASES, 'b', 'bajar')).toBeNull()
  })
})
