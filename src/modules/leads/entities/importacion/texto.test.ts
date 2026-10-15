import { describe, expect, it } from 'vitest'
import { comparable, esNotacionCientifica, sinApostrofoDeFormula } from './texto'

describe('comparable', () => {
  it('ignora mayúsculas, tildes, signos y espacios de sobra', () => {
    expect(comparable('  Teléfono  Principal ')).toBe('telefono principal')
    expect(comparable('ORIGEN_DEL-LEAD')).toBe('origen del lead')
    expect(comparable('Género (opcional)')).toBe('genero opcional')
    expect(comparable('Cédula')).toBe(comparable('cedula'))
  })

  it('no rompe con vacío ni con emojis', () => {
    expect(comparable('')).toBe('')
    expect(comparable('🚗')).toBe('')
  })
})

describe('sinApostrofoDeFormula', () => {
  it('quita el que puso la exportación', () => {
    expect(sinApostrofoDeFormula("'+5491122334455")).toBe('+5491122334455')
    expect(sinApostrofoDeFormula("'=1+1")).toBe('=1+1')
    expect(sinApostrofoDeFormula("'-5")).toBe('-5')
    expect(sinApostrofoDeFormula("'@algo")).toBe('@algo')
  })

  it('deja el apóstrofo que es parte del dato', () => {
    expect(sinApostrofoDeFormula("O'Brien")).toBe("O'Brien")
    expect(sinApostrofoDeFormula("'hola")).toBe("'hola")
    expect(sinApostrofoDeFormula("''=x")).toBe("''=x")
  })
})

describe('esNotacionCientifica', () => {
  it.each(['5.917E+10', '5,917e10', '5917E10', '-1.5e-3'])('«%s» lo es', (texto) => {
    expect(esNotacionCientifica(texto)).toBe(true)
  })

  it.each(['59170011002', '+591 7001 1002', 'e10', '70-01', 'E+10', ''])('«%s» no', (texto) => {
    expect(esNotacionCientifica(texto)).toBe(false)
  })
})
