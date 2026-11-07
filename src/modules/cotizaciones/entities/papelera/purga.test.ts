import { describe, expect, it } from 'vitest'
import { diasParaLaPurga, textoDePurga } from './purga'

const AHORA = '2026-11-06T12:00:00.000Z'

describe('diasParaLaPurga', () => {
  it('días enteros que faltan, hacia arriba', () => {
    expect(diasParaLaPurga('2026-11-09T12:00:00.000Z', AHORA)).toBe(3)
    expect(diasParaLaPurga('2026-11-09T12:00:00.001Z', AHORA)).toBe(4)
    expect(diasParaLaPurga('2026-11-06T13:00:00.000Z', AHORA)).toBe(1)
  })

  it('vencido o justo ahora es cero', () => {
    expect(diasParaLaPurga(AHORA, AHORA)).toBe(0)
    expect(diasParaLaPurga('2026-11-01T00:00:00.000Z', AHORA)).toBe(0)
  })
})

describe('textoDePurga', () => {
  it('lo dice en palabras', () => {
    expect(textoDePurga(0)).toBe('Se purga en la próxima pasada')
    expect(textoDePurga(-2)).toBe('Se purga en la próxima pasada')
    expect(textoDePurga(1)).toBe('Se purga mañana')
    expect(textoDePurga(5)).toBe('Se purga en 5 días')
  })
})
