import { describe, expect, it } from 'vitest'
import { estadoDelProyecto } from './estado'

describe('estadoDelProyecto', () => {
  it('cerrado gana a todo, aun con pendientes', () => {
    expect(estadoDelProyecto({ cerradoEn: '2026-11-12T10:00:00Z', items: 5, pendientes: 3 })).toBe(
      'cerrado',
    )
    expect(estadoDelProyecto({ cerradoEn: '2026-11-12T10:00:00Z', items: 0, pendientes: 0 })).toBe(
      'cerrado',
    )
  })

  it('sin ítems', () => {
    expect(estadoDelProyecto({ cerradoEn: null, items: 0, pendientes: 0 })).toBe('sin_items')
  })

  it('con algún pendiente está en curso', () => {
    expect(estadoDelProyecto({ cerradoEn: null, items: 4, pendientes: 1 })).toBe('en_curso')
  })

  it('si todo terminó o está en stock, está completo (y no cerrado)', () => {
    expect(estadoDelProyecto({ cerradoEn: null, items: 4, pendientes: 0 })).toBe('completo')
  })

  it('las cuentas topadas en 201 no cambian el estado', () => {
    expect(estadoDelProyecto({ cerradoEn: null, items: 201, pendientes: 201 })).toBe('en_curso')
    expect(estadoDelProyecto({ cerradoEn: null, items: 201, pendientes: 0 })).toBe('completo')
  })
})
