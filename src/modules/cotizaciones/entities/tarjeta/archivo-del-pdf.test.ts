import { describe, expect, it } from 'vitest'
import { archivoDelPdf } from './archivo-del-pdf'

describe('archivoDelPdf: el nombre del PDF de una cotización', () => {
  it('es cotizacion-<n>.pdf, sin separador de miles', () => {
    expect(archivoDelPdf(7)).toBe('cotizacion-7.pdf')
    expect(archivoDelPdf(12345)).toBe('cotizacion-12345.pdf')
  })

  it.each([0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'un número que no es de una cotización (%s) no arma un nombre',
    (numero) => {
      expect(archivoDelPdf(numero)).toBeNull()
    },
  )
})
