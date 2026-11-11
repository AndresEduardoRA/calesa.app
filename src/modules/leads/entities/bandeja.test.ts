import { describe, expect, it } from 'vitest'
import { creadoAntesDe, finDeHoy, rutaDeSeguimientos } from './bandeja'

describe('finDeHoy', () => {
  it('termina a la medianoche de La Paz (UTC−4), no a la de UTC', () => {
    // 21:00 en La Paz del 10 = 01:00 UTC del 11: en UTC ya es otro día.
    expect(finDeHoy('2026-11-11T01:00:00Z', 'America/La_Paz')).toBe('2026-11-11T04:00:00.000Z')
  })

  it('un minuto antes y un minuto después de la medianoche local caen en días distintos', () => {
    expect(finDeHoy('2026-11-11T03:59:00Z', 'America/La_Paz')).toBe('2026-11-11T04:00:00.000Z')
    expect(finDeHoy('2026-11-11T04:01:00Z', 'America/La_Paz')).toBe('2026-11-12T04:00:00.000Z')
  })

  it('usa la zona de la empresa', () => {
    expect(finDeHoy('2026-11-11T12:00:00Z', 'America/Bogota')).toBe('2026-11-12T05:00:00.000Z')
  })
})

describe('creadoAntesDe', () => {
  it('resta 24 horas', () => {
    expect(creadoAntesDe('2026-11-11T12:00:00.000Z')).toBe('2026-11-10T12:00:00.000Z')
  })
})

describe('rutaDeSeguimientos', () => {
  it('abre la ficha en la sección de seguimientos', () => {
    expect(rutaDeSeguimientos('abc')).toBe('/leads/abc?seccion=seguimientos')
  })
})
