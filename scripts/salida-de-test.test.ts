import { describe, expect, it } from 'vitest'
import { nombreDeCorrida, sinColores, sobrantesDeSalidas } from './salida-de-test'

describe('salida-de-test', () => {
  it('el nombre lleva segundos y pid, y ordena como texto', () => {
    expect(nombreDeCorrida(new Date('2026-10-23T21:08:30Z'), 4242)).toBe('2026-10-23_21-08-30-4242')
  })

  it('dos corridas del mismo segundo no comparten nombre', () => {
    const ahora = new Date('2026-10-23T21:08:30Z')
    expect(nombreDeCorrida(ahora, 1)).not.toBe(nombreDeCorrida(ahora, 2))
  })

  it('con cuatro viejas más la actual no sobra ninguna', () => {
    const viejas = [
      '2026-10-23_01-00-00-1',
      '2026-10-23_02-00-00-1',
      '2026-10-23_03-00-00-1',
      '2026-10-23_04-00-00-1',
    ]
    expect(
      sobrantesDeSalidas([...viejas, '2026-10-23_05-00-00-9'], '2026-10-23_05-00-00-9', 5),
    ).toEqual([])
  })

  it('con cinco viejas y la actual sobra la más vieja', () => {
    const existentes = [
      '2026-10-23_03-00-00-1',
      '2026-10-23_01-00-00-1',
      '2026-10-23_02-00-00-1',
      '2026-10-23_05-00-00-1',
      '2026-10-23_04-00-00-1',
      '2026-10-23_06-00-00-9',
    ]
    expect(sobrantesDeSalidas(existentes, '2026-10-23_06-00-00-9', 5)).toEqual([
      '2026-10-23_01-00-00-1',
    ])
  })

  it('la actual nunca sobra, aunque su reloj sea el más viejo', () => {
    const existentes = [
      '2026-10-23_05-00-00-1',
      '2026-10-23_06-00-00-1',
      '2026-10-23_07-00-00-1',
      '2026-10-23_08-00-00-1',
      '2026-10-23_09-00-00-1',
      '2026-10-22_00-00-00-9',
    ]
    const fuera = sobrantesDeSalidas(existentes, '2026-10-22_00-00-00-9', 5)
    expect(fuera).toEqual(['2026-10-23_05-00-00-1'])
    expect(fuera).not.toContain('2026-10-22_00-00-00-9')
  })

  it('quita los códigos de color', () => {
    expect(sinColores('\u001b[31mFAIL\u001b[39m  \u001b[1mx\u001b[22m')).toBe('FAIL  x')
  })
})
