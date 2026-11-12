import { describe, expect, it } from 'vitest'
import { pareceTelefono } from './telefono-en-la-busqueda'

describe('pareceTelefono', () => {
  it.each(['+591 70012345', '(591) 700-12345', '70012345', ' 7001 2345 ', '591.700.12345'])(
    '«%s» parece un teléfono',
    (texto) => {
      expect(pareceTelefono(texto)).toBe(true)
    },
  )

  it.each(['#70012345', 'Juan 70012345', '123456', 'ab', '', '+--  ', '7001234x'])(
    '«%s» no',
    (texto) => {
      expect(pareceTelefono(texto)).toBe(false)
    },
  )

  it('con # va a buscar el número de lead aunque tenga 7 dígitos', () => {
    expect(pareceTelefono('#7001234')).toBe(false)
  })
})
