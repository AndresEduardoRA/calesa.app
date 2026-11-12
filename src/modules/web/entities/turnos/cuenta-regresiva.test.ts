import { describe, expect, it } from 'vitest'
import { cuentaRegresiva } from './cuenta-regresiva'

const AHORA = '2026-11-12T12:00:00.000Z'
const despues = (ms: number) => new Date(Date.parse(AHORA) + ms).toISOString()
const MIN = 60_000

describe('cuentaRegresiva', () => {
  it('sin vence_en (contacto directo) no tiene reloj ni vence', () => {
    expect(cuentaRegresiva(null, AHORA)).toEqual({ vencido: false, texto: 'Sin límite de tiempo' })
  })

  it('con 1 h 05 min por delante dice horas y minutos con dos cifras', () => {
    expect(cuentaRegresiva(despues(65 * MIN), AHORA)).toEqual({
      vencido: false,
      texto: 'Vence en 1 h 05 min',
    })
  })

  it('justo 1 h es «1 h 00 min» y 59 min 59 s es «59 min»', () => {
    expect(cuentaRegresiva(despues(60 * MIN), AHORA).texto).toBe('Vence en 1 h 00 min')
    expect(cuentaRegresiva(despues(60 * MIN - 1000), AHORA).texto).toBe('Vence en 59 min')
  })

  it('menos de 1 h dice sólo minutos', () => {
    expect(cuentaRegresiva(despues(12 * MIN + 30_000), AHORA).texto).toBe('Vence en 12 min')
  })

  it('menos de 1 min dice «menos de 1 min» y no está vencido', () => {
    expect(cuentaRegresiva(despues(59_000), AHORA)).toEqual({
      vencido: false,
      texto: 'Vence en menos de 1 min',
    })
    expect(cuentaRegresiva(despues(1), AHORA).vencido).toBe(false)
  })

  it('en el instante exacto ya está vencido (borde inclusivo)', () => {
    expect(cuentaRegresiva(AHORA, AHORA)).toEqual({ vencido: true, texto: 'Vencido' })
  })

  it('pasado el plazo sigue vencido', () => {
    expect(cuentaRegresiva(despues(-5 * MIN), AHORA)).toEqual({ vencido: true, texto: 'Vencido' })
  })
})
