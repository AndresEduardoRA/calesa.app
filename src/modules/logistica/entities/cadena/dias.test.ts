import { describe, expect, it } from 'vitest'
import { textoDeLosDiasEnLaFase } from './dias'

const ahora = new Date('2026-11-10T15:00:00Z')

describe('textoDeLosDiasEnLaFase', () => {
  it('hoy, un día y varios', () => {
    expect(textoDeLosDiasEnLaFase('2026-11-10T13:00:00Z', ahora)).toBe('Entró hoy')
    expect(textoDeLosDiasEnLaFase('2026-11-09T13:00:00Z', ahora)).toBe('1 día en la fase')
    expect(textoDeLosDiasEnLaFase('2026-11-05T13:00:00Z', ahora)).toBe('5 días en la fase')
  })
  it('sin fecha, nada', () => {
    expect(textoDeLosDiasEnLaFase(null, ahora)).toBeNull()
  })
})
