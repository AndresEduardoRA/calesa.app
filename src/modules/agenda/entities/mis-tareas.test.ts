import { describe, expect, it } from 'vitest'
import { estaVencida } from './mis-tareas'

const AHORA = '2026-11-11T14:00:00.000Z'

describe('estaVencida', () => {
  it('una tarea sin fecha no vence', () => {
    expect(estaVencida(null, AHORA)).toBe(false)
  })

  it('una hora que ya pasó está vencida', () => {
    expect(estaVencida('2026-11-11T13:59:59Z', AHORA)).toBe(true)
  })

  it('la hora exacta todavía no, ni una futura', () => {
    expect(estaVencida(AHORA, AHORA)).toBe(false)
    expect(estaVencida('2026-11-11T14:00:01Z', AHORA)).toBe(false)
  })
})
