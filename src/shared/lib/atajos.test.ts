import { describe, expect, it } from 'vitest'
import { atajoDe, combinacionDe, valeMientrasSeEscribe, type Tecla } from './atajos'

function tecla(key: string, extra: Partial<Tecla> = {}): Tecla {
  return { key, ctrlKey: false, metaKey: false, altKey: false, ...extra }
}

describe('combinacionDe', () => {
  it('trata Ctrl y Cmd como el mismo modificador', () => {
    expect(combinacionDe(tecla('k', { ctrlKey: true }))).toBe('mod+k')
    expect(combinacionDe(tecla('K', { metaKey: true }))).toBe('mod+k')
  })

  it('pasa la tecla a minúsculas', () => {
    expect(combinacionDe(tecla('Escape'))).toBe('escape')
    expect(combinacionDe(tecla('N'))).toBe('n')
  })
})

describe('atajoDe', () => {
  it('reconoce los atajos del catálogo', () => {
    expect(atajoDe(tecla('Escape'))).toBe('cerrar')
    expect(atajoDe(tecla('k', { metaKey: true }))).toBe('buscar')
    expect(atajoDe(tecla('n'))).toBe('nuevo')
    expect(atajoDe(tecla('Enter', { ctrlKey: true }))).toBe('guardarYSeguir')
  })

  it('devuelve null para lo que no es un atajo', () => {
    expect(atajoDe(tecla('k'))).toBeNull()
    expect(atajoDe(tecla('n', { ctrlKey: true }))).toBeNull()
    expect(atajoDe(tecla('n', { altKey: true }))).toBeNull()
  })
})

describe('valeMientrasSeEscribe', () => {
  it('deja pasar Esc y los que llevan modificador', () => {
    expect(valeMientrasSeEscribe('cerrar')).toBe(true)
    expect(valeMientrasSeEscribe('buscar')).toBe(true)
    expect(valeMientrasSeEscribe('guardar')).toBe(true)
  })

  it('frena los de una sola tecla', () => {
    expect(valeMientrasSeEscribe('nuevo')).toBe(false)
    expect(valeMientrasSeEscribe('ayuda')).toBe(false)
  })
})
