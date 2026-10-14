import { describe, expect, it } from 'vitest'
import { opcionesQueCoinciden } from './opciones'

const OPCIONES = [
  { valor: 'a', etiqueta: 'Cochabamba' },
  { valor: 'b', etiqueta: 'Santa Cruz' },
  { valor: 'c', etiqueta: 'La Paz' },
  { valor: 'd', etiqueta: 'Potosí' },
]

describe('opcionesQueCoinciden', () => {
  it('sin texto trae todas, en su orden', () => {
    expect(opcionesQueCoinciden(OPCIONES, '').map((o) => o.valor)).toEqual(['a', 'b', 'c', 'd'])
    expect(opcionesQueCoinciden(OPCIONES, '   ')).toHaveLength(4)
  })

  it('ignora mayúsculas y tildes en las dos puntas', () => {
    expect(opcionesQueCoinciden(OPCIONES, 'POTOSI').map((o) => o.valor)).toEqual(['d'])
    expect(opcionesQueCoinciden(OPCIONES, 'potosí').map((o) => o.valor)).toEqual(['d'])
  })

  it('contiene el texto, no sólo empieza', () => {
    expect(opcionesQueCoinciden(OPCIONES, 'cruz').map((o) => o.valor)).toEqual(['b'])
  })

  it('los comodines y signos son literales y no encuentran nada', () => {
    expect(opcionesQueCoinciden(OPCIONES, '%')).toEqual([])
    expect(opcionesQueCoinciden(OPCIONES, '.*')).toEqual([])
  })
})
