import { describe, expect, it } from 'vitest'
import {
  diaEnZona,
  fechaRelativa,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
} from './fechas'

describe('formatear en la zona de la empresa', () => {
  it('muestra el día de La Paz, no el de UTC', () => {
    // 03:30 UTC del 11 todavía es el 10 a las 23:30 en La Paz (UTC-4)
    expect(formatearFecha('2026-10-11T03:30:00Z')).toBe('10 oct 2026')
    expect(diaEnZona('2026-10-11T03:30:00Z')).toBe('2026-10-10')
    expect(diaEnZona('2026-10-11T03:30:00Z', { zona: 'UTC' })).toBe('2026-10-11')
  })

  it('muestra la hora en 24 h', () => {
    expect(formatearFechaHora('2026-10-11T18:30:00Z')).toBe('11 oct 2026, 14:30')
    expect(formatearHora('2026-10-11T18:30:00Z')).toBe('14:30')
  })

  it('una fecha sin hora es el mismo día en cualquier zona', () => {
    expect(formatearFecha('2026-10-11')).toBe('11 oct 2026')
    expect(formatearFecha('2026-10-11', { zona: 'Asia/Tokyo' })).toBe('11 oct 2026')
    expect(formatearFecha('2026-10-11', { zona: 'America/Los_Angeles' })).toBe('11 oct 2026')
  })
})

describe('fechaRelativa', () => {
  // 14:00 del 11 de octubre en La Paz
  const ahora = new Date('2026-10-11T18:00:00Z')
  const relativa = (iso: string) => fechaRelativa(iso, { ahora })

  it('lo de hace segundos es «ahora»', () => {
    expect(relativa('2026-10-11T17:59:40Z')).toBe('ahora')
  })

  it('cuenta minutos y horas hacia atrás y hacia adelante', () => {
    expect(relativa('2026-10-11T17:59:00Z')).toBe('hace 1 minuto')
    expect(relativa('2026-10-11T17:55:00Z')).toBe('hace 5 minutos')
    expect(relativa('2026-10-11T15:00:00Z')).toBe('hace 3 horas')
    expect(relativa('2026-10-11T18:20:00Z')).toBe('dentro de 20 minutos')
  })

  it('cuenta los días por calendario de la empresa', () => {
    // 39 h antes, pero dos días de calendario atrás en La Paz
    expect(relativa('2026-10-10T03:00:00Z')).toBe('anteayer')
    expect(relativa('2026-10-08T12:00:00Z')).toBe('hace 3 días')
    expect(relativa('2026-10-13T12:00:00Z')).toBe('pasado mañana')
  })

  it('más allá de una semana muestra la fecha', () => {
    expect(relativa('2026-10-01T12:00:00Z')).toBe('1 oct 2026')
    expect(relativa('2026-11-20')).toBe('20 nov 2026')
  })

  it('una fecha sin hora sólo se expresa en días', () => {
    expect(relativa('2026-10-11')).toBe('hoy')
    expect(relativa('2026-10-12')).toBe('mañana')
    expect(relativa('2026-10-10')).toBe('ayer')
  })
})
