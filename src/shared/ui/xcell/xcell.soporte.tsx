import { cleanup, fireEvent, render } from '@testing-library/react'
import { vi } from 'vitest'
import { XCell, type XCellProps } from './index'

export const BASE: XCellProps = {
  id: 'fees',
  label: 'Fees',
  format: 'monto',
  value: 1234.567,
  suggested: false,
  overridden: false,
  onCommit: () => undefined,
  onReset: () => undefined,
}

export function celda(props: Partial<XCellProps> = {}) {
  const onCommit = vi.fn()
  const onReset = vi.fn()
  const resultado = render(<XCell {...BASE} onCommit={onCommit} onReset={onReset} {...props} />)
  const raiz = resultado.container.querySelector<HTMLElement>('[data-xcell]')
  if (!raiz) throw new Error('la celda no se dibujó')
  const parada = (n: number) => raiz.querySelector<HTMLElement>(`[data-parada="${String(n)}"]`)
  const entrada = () => raiz.querySelector<HTMLInputElement>('input')
  return { ...resultado, raiz, parada, entrada, onCommit, onReset }
}

export function abrir(c: ReturnType<typeof celda>, parada = 0) {
  const boton = c.parada(parada)
  if (!boton) throw new Error('no hay botón')
  fireEvent.click(boton)
  const entrada = c.entrada()
  if (!entrada) throw new Error('no se abrió la edición')
  return entrada
}

export { cleanup }
