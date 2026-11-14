import { describe, expect, it } from 'vitest'
import {
  abreviaturaDeZona,
  formatearFechaHoraConZona,
  diaEnZona,
  diaSiguiente,
  formatearDiaYMes,
  sumarDias,
  fechaRelativa,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  inicioDelDia,
  instanteDeLocal,
  localDeInstante,
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

describe('fechaRelativa con número', () => {
  const ahora = new Date('2026-10-11T18:00:00Z')
  const numerica = (iso: string) => fechaRelativa(iso, { ahora, numerico: true })

  it('dice cuántos días aunque la forma corriente diga «ayer» o «pasado mañana»', () => {
    expect(numerica('2026-10-10T12:00:00Z')).toBe('hace 1 día')
    expect(numerica('2026-10-09T12:00:00Z')).toBe('hace 2 días')
    expect(numerica('2026-10-12T22:00:00Z')).toBe('dentro de 1 día')
    expect(numerica('2026-10-13T12:00:00Z')).toBe('dentro de 2 días')
  })

  it('el mismo día de calendario es «hoy» y lo demás no cambia', () => {
    expect(numerica('2026-10-11')).toBe('hoy')
    expect(numerica('2026-10-11T15:00:00Z')).toBe('hace 3 horas')
    expect(numerica('2026-10-01T12:00:00Z')).toBe('1 oct 2026')
  })
})

describe('días para filtrar', () => {
  it('el día siguiente cruza de mes y de año', () => {
    expect(diaSiguiente('2026-10-13')).toBe('2026-10-14')
    expect(diaSiguiente('2026-02-28')).toBe('2026-03-01')
    expect(diaSiguiente('2026-12-31')).toBe('2027-01-01')
  })

  it('un día de la empresa empieza a su medianoche, no a la de UTC', () => {
    expect(inicioDelDia('2026-10-13', { zona: 'America/La_Paz' })).toBe('2026-10-13T04:00:00.000Z')
    expect(inicioDelDia('2026-10-13', { zona: 'UTC' })).toBe('2026-10-13T00:00:00.000Z')
  })
})

describe('fecha con hora de un formulario', () => {
  it('la hora que se escribe es la de la empresa, y se guarda en UTC', () => {
    expect(instanteDeLocal('2026-10-13T14:30', { zona: 'America/La_Paz' })).toBe(
      '2026-10-13T18:30:00.000Z',
    )
    expect(localDeInstante('2026-10-13T18:30:00.000Z', { zona: 'America/La_Paz' })).toBe(
      '2026-10-13T14:30',
    )
  })

  it('lo que no es una fecha no se inventa', () => {
    expect(instanteDeLocal('mañana')).toBeNull()
    expect(instanteDeLocal('2026-13-45T99:99')).toBeNull()
    expect(localDeInstante('ayer')).toBe('')
  })
})

describe('días del calendario', () => {
  it('suma y resta días sin depender de la zona', () => {
    expect(sumarDias('2026-10-13', 3)).toBe('2026-10-16')
    expect(sumarDias('2026-10-30', 3)).toBe('2026-11-02')
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02')
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(sumarDias('2026-10-13', 0)).toBe('2026-10-13')
  })

  it('dice día y mes: «15/10»', () => {
    expect(formatearDiaYMes('2026-10-15')).toBe('15/10')
    expect(formatearDiaYMes('2026-01-05')).toBe('05/01')
    expect(formatearDiaYMes('no es una fecha')).toBe('')
    expect(formatearDiaYMes('2026-10-15T10:00:00Z')).toBe('')
  })
})

describe('la zona en la fecha de una subasta (horario de verano de EE. UU.)', () => {
  const NY = { zona: 'America/New_York' }

  it('la abreviatura cambia con el horario de verano', () => {
    // 8 de marzo de 2026 a las 2:00 pasa a las 3:00 (EDT, UTC-4); antes, EST (UTC-5).
    expect(abreviaturaDeZona('2026-03-08T06:59:00Z', NY)).toMatch(/GMT-5|EST/)
    expect(abreviaturaDeZona('2026-03-08T07:00:00Z', NY)).toMatch(/GMT-4|EDT/)
    // 1 de noviembre de 2026 a las 2:00 vuelve a la 1:00.
    expect(abreviaturaDeZona('2026-11-01T05:59:00Z', NY)).toMatch(/GMT-4|EDT/)
    expect(abreviaturaDeZona('2026-11-01T06:00:00Z', NY)).toMatch(/GMT-5|EST/)
  })

  it('la fecha lleva la hora local y su zona', () => {
    expect(formatearFechaHoraConZona('2026-07-15T18:00:00Z', NY)).toMatch(
      /^15 jul 2026, 14:00 (GMT-4|EDT)$/,
    )
    expect(formatearFechaHoraConZona('2026-07-15T18:00:00Z', { zona: 'America/La_Paz' })).toMatch(
      /^15 jul 2026, 14:00 GMT-4$/,
    )
  })

  it('la hora que no existe (2:30 del cambio de marzo) y la repetida (1:30 de noviembre) se guardan en un instante válido', () => {
    const inexistente = instanteDeLocal('2026-03-08T02:30', NY)
    expect(inexistente).not.toBeNull()
    expect(new Date(inexistente ?? '').getUTCHours()).toBeGreaterThanOrEqual(6)
    const repetida = instanteDeLocal('2026-11-01T01:30', NY)
    expect(['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']).toContain(repetida)
  })
})
