import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, celda } from './xcell.soporte'
import { type XCellProps } from './index'

afterEach(cleanup)

describe('el par porcentaje–monto', () => {
  const PAR: Partial<XCellProps> = {
    id: 'iva',
    label: 'IVA',
    value: 181,
    secondaryId: 'iva_pct',
    secondaryFormat: 'porcentaje',
    secondaryValue: 0.1494,
  }

  it('son dos paradas: el monto y el porcentaje', () => {
    const c = celda(PAR)
    expect(c.parada(0)?.textContent).toContain('181')
    expect(c.parada(1)?.textContent).toContain('14,94')
  })

  it('cada lado emite su propio id', () => {
    const c = celda(PAR)
    fireEvent.change(abrir(c, 0), { target: { value: '200' } })
    fireEvent.keyDown(c.entrada() as HTMLInputElement, { key: 'Enter' })
    expect(c.onCommit).toHaveBeenLastCalledWith('iva', 200)
    fireEvent.change(abrir(c, 1), { target: { value: '13' } })
    fireEvent.keyDown(c.entrada() as HTMLInputElement, { key: 'Enter' })
    expect(c.onCommit).toHaveBeenLastCalledWith('iva_pct', 0.13)
  })

  it('el secundario también abre tipeando, y devuelve el foco a su lado', () => {
    const c = celda(PAR)
    fireEvent.keyDown(c.parada(1) as HTMLElement, { key: '9' })
    expect(c.entrada()?.value).toBe('9')
    expect(c.entrada()?.getAttribute('aria-label')).toBe('IVA, porcentaje')
    fireEvent.keyDown(c.entrada() as HTMLInputElement, { key: 'Escape' })
    expect(document.activeElement).toBe(c.parada(1))
  })

  it('↺ emite el id de la celda (la hoja quita los dos overrides)', () => {
    const c = celda({ ...PAR, overridden: true })
    fireEvent.click(c.parada(12) as HTMLElement)
    expect(c.onReset).toHaveBeenCalledExactlyOnceWith('iva')
  })

  it('un porcentaje principal con el monto de secundario', () => {
    const c = celda({
      format: 'porcentaje',
      value: 0.1494,
      secondaryId: 'monto',
      secondaryFormat: 'monto',
      secondaryValue: 181,
    })
    fireEvent.change(abrir(c, 1), { target: { value: '300' } })
    fireEvent.keyDown(c.entrada() as HTMLInputElement, { key: 'Enter' })
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('monto', 300)
  })
})

describe('las flechas y el recorrido de Tab', () => {
  const MODIFICADA: Partial<XCellProps> = {
    overridden: true,
    secondaryId: 'p',
    secondaryFormat: 'porcentaje',
    secondaryValue: 0.1,
  }

  it('las acciones no son paradas de Tab: los valores sí', () => {
    const c = celda(MODIFICADA)
    expect(c.parada(12)?.getAttribute('tabindex')).toBe('-1')
    expect(c.parada(0)?.hasAttribute('tabindex')).toBe(false)
    expect(c.parada(1)?.hasAttribute('tabindex')).toBe(false)
  })

  it('→ recorre valor, secundario y ↺ en ese orden, y ← vuelve', () => {
    const c = celda(MODIFICADA)
    c.parada(0)?.focus()
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(c.parada(1))
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(c.parada(12))
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(c.parada(12))
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(c.parada(1))
  })

  it('→ recorre las cinco paradas (valor, secundario, ayuda, ⚙, ↺) y Esc en cada acción vuelve al valor', () => {
    const c = celda({
      ...MODIFICADA,
      hasHelp: true,
      onHelp: vi.fn(),
      hasSettings: true,
      onSettings: vi.fn(),
    })
    c.parada(0)?.focus()
    for (const parada of [1, 10, 11, 12]) {
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' })
      expect(document.activeElement).toBe(c.parada(parada))
    }
    for (const parada of [10, 11, 12]) {
      c.parada(parada)?.focus()
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' })
      expect(document.activeElement).toBe(c.parada(0))
    }
  })

  it('Esc en ↺ vuelve al valor; Esc en el valor no lo atiende (es del modal)', () => {
    const alEsc = vi.fn()
    const c = celda(MODIFICADA)
    c.parada(12)?.focus()
    fireEvent.keyDown(c.parada(12) as HTMLElement, { key: 'Escape' })
    expect(document.activeElement).toBe(c.parada(0))
    c.raiz.parentElement?.addEventListener('keydown', alEsc)
    fireEvent.keyDown(c.parada(0) as HTMLElement, { key: 'Escape' })
    expect(alEsc).toHaveBeenCalledTimes(1)
  })

  it('en la entrada abierta las flechas mueven el cursor: la celda no las toma', () => {
    const c = celda(MODIFICADA)
    const entrada = abrir(c)
    expect(fireEvent.keyDown(entrada, { key: 'ArrowRight' })).toBe(true)
    expect(c.entrada()).not.toBeNull()
  })

  it('↺ lleva el foco al valor y avisa a la hoja', () => {
    const c = celda(MODIFICADA)
    c.parada(12)?.focus()
    fireEvent.click(c.parada(12) as HTMLElement)
    expect(document.activeElement).toBe(c.parada(0))
    expect(c.onReset).toHaveBeenCalledExactlyOnceWith('fees')
  })
})
