import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_DE_LAS_NOTAS, validarNotas } from './notas'

describe('validarNotas', () => {
  it('recorta los bordes y dice nulo si queda vacío', () => {
    expect(validarNotas('  hola ')).toEqual({ ok: true, valor: 'hola' })
    expect(validarNotas('   ')).toEqual({ ok: true, valor: null })
  })

  it('cuenta caracteres, no unidades UTF-16', () => {
    expect(validarNotas('😀'.repeat(LARGO_MAXIMO_DE_LAS_NOTAS)).ok).toBe(true)
    expect(validarNotas('a'.repeat(LARGO_MAXIMO_DE_LAS_NOTAS + 1))).toEqual({ ok: false })
  })
})
