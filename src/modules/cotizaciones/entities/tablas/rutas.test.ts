import { describe, expect, it } from 'vitest'
import { rutaDeLasTablas } from './rutas'

describe('rutaDeLasTablas', () => {
  it('lleva la pestaña, el origen y, si se pide, la tabla', () => {
    expect(rutaDeLasTablas('o1')).toBe('/configuracion/cotizacion?seccion=tablas&origen=o1')
    expect(rutaDeLasTablas('o1', 't1')).toBe(
      '/configuracion/cotizacion?seccion=tablas&origen=o1&tabla=t1',
    )
  })
})
