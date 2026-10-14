import { describe, expect, it } from 'vitest'
import { atajosDeFecha, validarRecordatorio } from './recordatorio'

const ZONA = 'America/La_Paz' // UTC-4

describe('atajosDeFecha', () => {
  it('mañana y en 3 días, a las 9:00 de la zona de la empresa', () => {
    // 2026-10-14 15:30 en La Paz.
    const atajos = atajosDeFecha('2026-10-14T19:30:00.000Z', ZONA)
    expect(atajos.map((a) => a.local)).toEqual(['2026-10-15T09:00', '2026-10-17T09:00'])
    expect(atajos.map((a) => a.etiqueta)).toEqual(['Mañana 09:00', 'En 3 días 09:00'])
  })

  it('el día lo da la zona, no UTC: a las 22:00 de La Paz en UTC ya es mañana', () => {
    // 2026-10-14 22:00 en La Paz = 2026-10-15T02:00Z.
    const atajos = atajosDeFecha('2026-10-15T02:00:00.000Z', ZONA)
    expect(atajos[0]?.local).toBe('2026-10-15T09:00')
  })

  it('cruza el fin de mes', () => {
    const atajos = atajosDeFecha('2026-10-30T15:00:00.000Z', ZONA)
    expect(atajos.map((a) => a.local)).toEqual(['2026-10-31T09:00', '2026-11-02T09:00'])
  })
})

describe('validarRecordatorio', () => {
  const ahora = '2026-10-14T19:30:00.000Z'

  it('un futuro vale y viaja como instante', () => {
    expect(validarRecordatorio('2026-10-15T09:00', ahora, ZONA)).toEqual({
      ok: true,
      recordarEn: '2026-10-15T13:00:00.000Z',
    })
  })

  it('el pasado y el mismo instante no', () => {
    expect(validarRecordatorio('2026-10-14T15:30', ahora, ZONA)).toMatchObject({ ok: false })
    expect(validarRecordatorio('2026-10-14T09:00', ahora, ZONA)).toMatchObject({
      ok: false,
      motivo: 'El recordatorio tiene que ser en el futuro.',
    })
  })

  it('lo vacío o ilegible pide una fecha', () => {
    expect(validarRecordatorio('', ahora, ZONA)).toEqual({
      ok: false,
      motivo: 'Elige cuándo recordarlo.',
    })
    expect(validarRecordatorio('mañana', ahora, ZONA)).toMatchObject({ ok: false })
  })
})
