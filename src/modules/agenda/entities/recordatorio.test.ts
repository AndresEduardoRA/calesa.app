import { describe, expect, it } from 'vitest'
import { detalleDeRecordatorioDesde, estadoDeRecordatorio } from './recordatorio'

const AHORA = '2026-11-11T14:00:00.000Z'

describe('estadoDeRecordatorio', () => {
  it('pendiente si su hora no llegó', () => {
    expect(
      estadoDeRecordatorio({ recordarEn: '2026-11-11T15:00:00Z', completadoEn: null }, AHORA),
    ).toBe('pendiente')
  })

  it('vencido si su hora ya pasó y sigue pendiente; a la hora exacta todavía no', () => {
    expect(
      estadoDeRecordatorio({ recordarEn: '2026-11-11T13:00:00Z', completadoEn: null }, AHORA),
    ).toBe('vencido')
    expect(estadoDeRecordatorio({ recordarEn: AHORA, completadoEn: null }, AHORA)).toBe('pendiente')
  })

  it('completado gana sobre vencido', () => {
    expect(
      estadoDeRecordatorio(
        { recordarEn: '2026-11-10T13:00:00Z', completadoEn: '2026-11-10T14:00:00Z' },
        AHORA,
      ),
    ).toBe('completado')
  })
})

describe('detalleDeRecordatorioDesde', () => {
  const fila = {
    id: '11111111-1111-4111-8111-111111111111',
    titulo: 'Llamar',
    recordar_en: '2026-11-11T15:00:00+00:00',
    completado_en: null,
    actualizado_en: '2026-11-11T12:00:00.5+00:00',
    lead_id: null,
    lead_nombre: null,
  }

  it('pasa a camelCase y conserva la versión tal cual', () => {
    expect(detalleDeRecordatorioDesde(fila)).toMatchObject({
      id: fila.id,
      recordarEn: fila.recordar_en,
      actualizadoEn: fila.actualizado_en,
      leadId: null,
    })
  })

  it('una fila sin lo esencial da nulo', () => {
    expect(detalleDeRecordatorioDesde({ ...fila, actualizado_en: null })).toBeNull()
    expect(detalleDeRecordatorioDesde({ ...fila, titulo: null })).toBeNull()
  })
})
