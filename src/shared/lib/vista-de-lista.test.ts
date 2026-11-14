import { describe, expect, it } from 'vitest'
import { esVistaDeLista, vistaDeLista } from './vista-de-lista'

describe('vistaDeLista', () => {
  it('la URL manda sobre la preferencia', () => {
    expect(vistaDeLista({ pedida: 'tarjetas', preferida: 'tabla' })).toBe('tarjetas')
    expect(vistaDeLista({ pedida: 'tabla', preferida: 'tarjetas' })).toBe('tabla')
  })

  it('sin URL, la preferencia; sin preferencia, la tabla', () => {
    expect(vistaDeLista({ pedida: null, preferida: 'tarjetas' })).toBe('tarjetas')
    expect(vistaDeLista({ pedida: undefined, preferida: null })).toBe('tabla')
  })

  it('una vista que no existe en la URL es como no pedir nada', () => {
    expect(vistaDeLista({ pedida: 'mosaico', preferida: 'tarjetas' })).toBe('tarjetas')
    expect(esVistaDeLista('Tabla')).toBe(false)
  })
})
