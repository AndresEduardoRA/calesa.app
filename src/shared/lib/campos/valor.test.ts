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
    expect(deAtributo({ tipo: 'texto' }, undefined, undefined)).toBe('')
    expect(deAtributo({ tipo: 'booleano' }, null, undefined)).toBeNull()
  })

  it('muestra números y textos como texto, y descarta lo que no es de su tipo', () => {
    expect(deAtributo({ tipo: 'numero' }, 12.5, undefined)).toBe('12.5')
    expect(deAtributo({ tipo: 'texto' }, { raro: true }, undefined)).toBe('')
    expect(deAtributo({ tipo: 'booleano' }, 'si', undefined)).toBeNull()
    expect(deAtributo({ tipo: 'multi_opcion' }, ['a', 3, 'b'], undefined)).toEqual(['a', 'b'])
  })

  it('una fecha con hora se muestra en la zona de la empresa', () => {
    expect(deAtributo({ tipo: 'fecha_hora' }, '2026-10-14T13:00:00.000Z', 'America/La_Paz')).toBe(
      '2026-10-14T09:00',
    )
  })
})
