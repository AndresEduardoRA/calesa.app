import { describe, expect, it } from 'vitest'
import { extraDeEnlaces } from './enlace-de-dia'
import { enlaceDePanel } from './enlace-de-panel'

const BASE = { vista: 'dia', fecha: '2026-11-12', extra: '' }

describe('enlaceDePanel', () => {
  it('abre el panel de un evento o de una tarea en la misma vista y fecha', () => {
    expect(enlaceDePanel(BASE, 'evento', 'abc')).toBe(
      '/agenda?vista=dia&fecha=2026-11-12&evento=abc',
    )
    expect(enlaceDePanel(BASE, 'tarea', 'xyz')).toBe('/agenda?vista=dia&fecha=2026-11-12&tarea=xyz')
  })

  it('conserva el filtro de clases y «la de todos»', () => {
    const base = { ...BASE, extra: 'ver=tarea&de=todos' }
    expect(enlaceDePanel(base, 'tarea', 'xyz')).toBe(
      '/agenda?ver=tarea&de=todos&vista=dia&fecha=2026-11-12&tarea=xyz',
    )
  })
})

describe('extraDeEnlaces', () => {
  it('sin filtro ni «la de todos» no agrega nada', () => {
    expect(extraDeEnlaces(['evento', 'tarea', 'recordatorio', 'subasta'], false)).toBe('')
  })

  it('con un filtro de clases y «la de todos», los conserva', () => {
    expect(extraDeEnlaces(['tarea'], true)).toBe('ver=tarea&de=todos')
  })
})
