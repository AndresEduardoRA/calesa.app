import { describe, expect, it } from 'vitest'
import { avisoDelTotal } from './aviso-del-total'

describe('avisoDelTotal', () => {
  it('con el recálculo al día y un total, nada', () => {
    expect(avisoDelTotal({ tipo: 'al_dia' }, 100)).toBeNull()
  })

  it('una guardada (sin estado) con total, nada', () => {
    expect(avisoDelTotal(null, 100)).toBeNull()
  })

  it.each(['esperando', 'recalculando'] as const)('con %s y un total, desactualizado', (tipo) => {
    expect(avisoDelTotal({ tipo }, 100)).toBe('desactualizado')
  })

  it('sin total, sin_total, haya o no estado', () => {
    expect(avisoDelTotal({ tipo: 'al_dia' }, null)).toBe('sin_total')
    expect(avisoDelTotal(null, null)).toBe('sin_total')
    expect(avisoDelTotal({ tipo: 'recalculando' }, null)).toBe('sin_total')
  })

  it('un total de cero es un total', () => {
    expect(avisoDelTotal({ tipo: 'al_dia' }, 0)).toBeNull()
  })
})
