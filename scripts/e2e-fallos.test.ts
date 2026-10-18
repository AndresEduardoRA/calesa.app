import { describe, expect, it } from 'vitest'
import { marcaDeFecha, sobrantes } from './e2e-fallos'

describe('e2e-fallos', () => {
  it('la carpeta se llama con la fecha y la hora, ordenable', () => {
    expect(marcaDeFecha(new Date('2026-10-18T21:08:30Z'))).toBe('2026-10-18_21-08')
  })

  it('con menos de cinco no sobra ninguna', () => {
    expect(sobrantes(['2026-10-17_21-08', '2026-10-16_04-31'], 5)).toEqual([])
  })

  it('con siete sobran las dos más viejas', () => {
    const siete = [
      '2026-10-19_03-00',
      '2026-10-16_04-31',
      '2026-10-17_21-08',
      '2026-10-16_00-30',
      '2026-10-19_01-00',
      '2026-10-18_03-00',
      '2026-10-19_02-00',
    ]
    expect(sobrantes(siete, 5)).toEqual(['2026-10-16_00-30', '2026-10-16_04-31'])
  })
})
