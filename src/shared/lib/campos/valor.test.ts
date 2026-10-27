import { describe, expect, it } from 'vitest'
import { deAtributo, vacioDe } from './valor'

describe('vacioDe', () => {
  it('un sí o no sin dato es nulo, una lista es vacía y lo demás es texto vacío', () => {
    expect(vacioDe({ tipo: 'booleano' })).toBeNull()
    expect(vacioDe({ tipo: 'multi_opcion' })).toEqual([])
    expect(vacioDe({ tipo: 'texto' })).toBe('')
    expect(vacioDe({ tipo: 'correo' })).toBe('')
  })
})

describe('deAtributo', () => {
  it('sin valor deja el vacío del tipo', () => {
    expect(deAtributo({ tipo: 'texto' }, undefined, undefined, 'es-BO')).toBe('')
    expect(deAtributo({ tipo: 'booleano' }, null, undefined, 'es-BO')).toBeNull()
  })

  it('muestra números y textos como texto, y descarta lo que no es de su tipo', () => {
    expect(deAtributo({ tipo: 'numero' }, 12.5, undefined, 'es-BO')).toBe('12,5')
    expect(deAtributo({ tipo: 'texto' }, { raro: true }, undefined, 'es-BO')).toBe('')
    expect(deAtributo({ tipo: 'booleano' }, 'si', undefined, 'es-BO')).toBeNull()
    expect(deAtributo({ tipo: 'multi_opcion' }, ['a', 3, 'b'], undefined, 'es-BO')).toEqual([
      'a',
      'b',
    ])
  })

  it('una fecha con hora se muestra en la zona de la empresa', () => {
    expect(
      deAtributo({ tipo: 'fecha_hora' }, '2026-10-14T13:00:00.000Z', 'America/La_Paz', 'es-BO'),
    ).toBe('2026-10-14T09:00')
  })
})

// 4.13-3c: lo guardado se escribe con el locale de la empresa, como lo lee el lector (sin miles y con su decimal).
describe('deAtributo con el locale', () => {
  it('un número de un campo numérico sale con el decimal del locale; un texto sale como está', () => {
    expect(deAtributo({ tipo: 'numero' }, 1.6, undefined, 'es-BO')).toBe('1,6')
    expect(deAtributo({ tipo: 'moneda' }, 2.125, undefined, 'es-BO')).toBe('2,125')
    expect(deAtributo({ tipo: 'moneda' }, 21500.25, undefined, 'es-BO')).toBe('21500,25')
    expect(deAtributo({ tipo: 'numero' }, 1.6, undefined, 'en-US')).toBe('1.6')
    expect(deAtributo({ tipo: 'moneda' }, 2.125, undefined, 'en-US')).toBe('2.125')
    expect(deAtributo({ tipo: 'texto' }, 'A.1', undefined, 'es-BO')).toBe('A.1')
    expect(deAtributo({ tipo: 'texto' }, 1.5, undefined, 'es-BO')).toBe('1.5')
  })
})
