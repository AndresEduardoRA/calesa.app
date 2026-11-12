import { describe, expect, it } from 'vitest'
import { cambiosDesde, lineaDelCambio, quienHizoElCambio } from './historial'

describe('lineaDelCambio', () => {
  it('dice «Entró a» sin fase de origen y «→» con ella', () => {
    expect(lineaDelCambio({ de: null, a: 'B' })).toBe('Entró a «B»')
    expect(lineaDelCambio({ de: 'A', a: 'B' })).toBe('«A» → «B»')
    expect(lineaDelCambio({ de: 'A', a: null })).toBe('«A» → sin fase')
  })
  it('sin persona, el sistema', () => {
    expect(quienHizoElCambio({ quien: null })).toBe('Sistema')
    expect(quienHizoElCambio({ quien: 'Rosa Mamani' })).toBe('Rosa Mamani')
  })
})

describe('cambiosDesde', () => {
  it('lee las filas y rechaza una forma mala', () => {
    const fila = {
      id: 41,
      creado_en: '2026-11-12T10:00:00+00:00',
      nota: 'Yo primero.',
      de: null,
      a: { nombre: 'B' },
      quien: { nombre: 'Rosa Mamani' },
    }
    expect(cambiosDesde([fila])).toEqual([
      {
        id: fila.id,
        creadoEn: fila.creado_en,
        nota: 'Yo primero.',
        de: null,
        a: 'B',
        quien: 'Rosa Mamani',
      },
    ])
    expect(cambiosDesde([{ id: '11111111-1111-4111-8111-111111111111' }])).toBeNull()
  })
})
