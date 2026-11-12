import { describe, expect, it } from 'vitest'
import { textoDeFaltan, textoDeUnidades, vencimientoDe } from './estado'

describe('el texto de «faltan»', () => {
  const base = { pagada: false, faltan: 0, vehiculos: 2, hayOcultos: false }

  it('pagada dice «Pagada» aunque haya ocultos', () => {
    expect(textoDeFaltan({ ...base, pagada: true })).toBe('Pagada')
    expect(textoDeFaltan({ ...base, pagada: true, hayOcultos: true })).toBe('Pagada')
  })

  it('dice cuántos faltan, también uno', () => {
    expect(textoDeFaltan({ ...base, faltan: 2 })).toBe('Faltan los tributos de 2')
    expect(textoDeFaltan({ ...base, faltan: 1 })).toBe('Faltan los tributos de 1')
  })

  it('con unidades que no se ven lo dice sólo si hay ocultos', () => {
    expect(textoDeFaltan({ ...base, faltan: 2, hayOcultos: true })).toBe(
      'Faltan los tributos de 2 y de unidades que no ves',
    )
    expect(textoDeFaltan({ ...base, faltan: 0, hayOcultos: true })).toBe(
      'Faltan los tributos de unidades que no ves',
    )
  })

  it('sin vehículos dice «Sin vehículos»', () => {
    expect(textoDeFaltan({ ...base, vehiculos: 0 })).toBe('Sin vehículos')
  })

  it('más de 200 no es un total exacto', () => {
    expect(textoDeFaltan({ ...base, faltan: 201, vehiculos: 201 })).toBe(
      'Faltan los tributos de más de 200',
    )
  })
})

describe('las unidades de la fila', () => {
  it('uno, varios y más de 200', () => {
    expect(textoDeUnidades(1)).toBe('1 vehículo')
    expect(textoDeUnidades(37)).toBe('37 vehículos')
    expect(textoDeUnidades(201)).toBe('más de 200 vehículos')
  })
})

describe('el vencimiento de los tributos', () => {
  const hoy = '2026-11-12'

  it('sin fecha', () => {
    expect(vencimientoDe(null, hoy, false)).toEqual({
      tipo: 'sin-fecha',
      texto: 'Sin fecha de vencimiento',
    })
  })

  it('vencida el día anterior, no hoy', () => {
    expect(vencimientoDe('2026-11-11', hoy, false).tipo).toBe('vencida')
    expect(vencimientoDe('2026-11-12', hoy, false)).toEqual({
      tipo: 'por-vencer',
      texto: 'Vence hoy',
    })
  })

  it('mañana y en N días hasta 7', () => {
    expect(vencimientoDe('2026-11-13', hoy, false).texto).toBe('Vence mañana')
    expect(vencimientoDe('2026-11-14', hoy, false).texto).toBe('Vence en 2 días')
    expect(vencimientoDe('2026-11-19', hoy, false)).toEqual({
      tipo: 'por-vencer',
      texto: 'Vence en 7 días',
    })
  })

  it('más allá de 7 días está vigente y dice la fecha', () => {
    const v = vencimientoDe('2026-11-20', hoy, false)
    expect(v.tipo).toBe('vigente')
    expect(v.texto).toBe('Vence el 20 nov 2026')
  })

  it('pagada no alarma: vigente con su fecha, aunque ya haya pasado', () => {
    expect(vencimientoDe('2026-11-01', hoy, true)).toEqual({
      tipo: 'vigente',
      texto: 'Vence el 1 nov 2026',
    })
    expect(vencimientoDe('2026-11-12', hoy, true).tipo).toBe('vigente')
  })

  it('el cambio de mes y de año cuenta días de calendario', () => {
    expect(vencimientoDe('2027-01-01', '2026-12-31', false).texto).toBe('Vence mañana')
  })
})
