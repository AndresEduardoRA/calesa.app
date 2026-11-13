import { describe, expect, it } from 'vitest'
import { validarMotivoDeAnulacion } from './anulacion-de-pago'

describe('validarMotivoDeAnulacion', () => {
  it('vacío y espacios fallan', () => {
    expect(validarMotivoDeAnulacion('').ok).toBe(false)
    expect(validarMotivoDeAnulacion('   ').ok).toBe(false)
  })

  it('500 letras valen y 501 no; recorta', () => {
    expect(validarMotivoDeAnulacion('a'.repeat(500)).ok).toBe(true)
    expect(validarMotivoDeAnulacion('a'.repeat(501)).ok).toBe(false)
    expect(validarMotivoDeAnulacion('  se equivocó  ')).toEqual({ ok: true, motivo: 'se equivocó' })
  })
})
