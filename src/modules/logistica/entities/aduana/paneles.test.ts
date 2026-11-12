import { describe, expect, it } from 'vitest'
import { MENSAJE_DECLARACION_YA_NO_ESTA, motivoParaNoAbrirDeclaracion } from './paneles'

describe('por qué una URL de declaración no se abre', () => {
  const base = { valor: 'abc', encontrada: {}, puedeGestionar: true, admiteNueva: false }

  it('sin permiso de gestionar nunca abre', () => {
    expect(motivoParaNoAbrirDeclaracion({ ...base, puedeGestionar: false })).toBe(
      MENSAJE_DECLARACION_YA_NO_ESTA,
    )
    expect(motivoParaNoAbrirDeclaracion({ ...base, puedeGestionar: null })).not.toBeNull()
  })

  it('una declaración que ya no está no abre', () => {
    expect(motivoParaNoAbrirDeclaracion({ ...base, encontrada: null })).toBe(
      MENSAJE_DECLARACION_YA_NO_ESTA,
    )
  })

  it('«nueva» sólo abre en el alta y sólo con permiso', () => {
    expect(
      motivoParaNoAbrirDeclaracion({
        ...base,
        valor: 'nueva',
        encontrada: null,
        admiteNueva: true,
      }),
    ).toBeNull()
    expect(
      motivoParaNoAbrirDeclaracion({ ...base, valor: 'nueva', encontrada: null }),
    ).not.toBeNull()
  })

  it('una declaración que está y con permiso abre', () => {
    expect(motivoParaNoAbrirDeclaracion(base)).toBeNull()
  })
})
