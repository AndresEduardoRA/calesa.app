import { describe, expect, it } from 'vitest'
import { diasEnLaFase, textoDeDiasEnLaFase } from './dias-en-la-fase'

// Mediodía en La Paz (UTC−4): lejos de la medianoche, el día de calendario no depende del huso del servidor.
const AHORA = new Date('2026-11-11T16:00:00Z')

describe('días en la fase', () => {
  it('cuenta días de calendario, no bloques de 24 horas', () => {
    expect(diasEnLaFase('2026-11-08T16:00:00Z', AHORA)).toBe(3)
    // Ayer a las 23:59 de La Paz: pasaron ~12 horas, pero es otro día.
    expect(diasEnLaFase('2026-11-11T03:59:00Z', AHORA)).toBe(1)
    expect(diasEnLaFase('2026-11-11T05:00:00Z', AHORA)).toBe(0)
  })

  it('sin fecha no se sabe, y una fecha futura no da días negativos', () => {
    expect(diasEnLaFase(null, AHORA)).toBeNull()
    expect(diasEnLaFase('2026-12-01T00:00:00Z', AHORA)).toBe(0)
  })

  it('el texto va en singular y plural, y no dice nada sin fecha', () => {
    expect(textoDeDiasEnLaFase('2026-11-08T16:00:00Z', AHORA)).toBe(
      'Desde hace 3 días en esta fase',
    )
    expect(textoDeDiasEnLaFase('2026-11-10T16:00:00Z', AHORA)).toBe('Desde hace 1 día en esta fase')
    expect(textoDeDiasEnLaFase('2026-11-11T15:00:00Z', AHORA)).toBe('Entró hoy a esta fase')
    expect(textoDeDiasEnLaFase(null, AHORA)).toBeNull()
  })
})
