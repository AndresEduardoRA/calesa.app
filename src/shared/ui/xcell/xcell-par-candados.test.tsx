import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { abrir, BASE, celda } from './xcell.soporte'
import { XCell, type XCellProps } from './index'

afterEach(cleanup)

const PAR: Partial<XCellProps> = {
  id: 'iva',
  label: 'IVA',
  value: 181,
  secondaryId: 'iva_pct',
  secondaryFormat: 'porcentaje',
  secondaryValue: 0.1494,
}
const MOTIVO = 'Se calcula con los demás datos.'
const OTRO = 'Lo fija la empresa.'

// Las notas que nombra el `aria-describedby` de un elemento, por su texto.
const descritoPor = (c: ReturnType<typeof celda>, e: Element | null) =>
  (e?.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => c.raiz.ownerDocument.getElementById(id)?.textContent ?? '')

function noAbre(c: ReturnType<typeof celda>, parada: number) {
  const boton = c.parada(parada) as HTMLElement
  fireEvent.click(boton)
  expect(c.entrada(), 'clic').toBeNull()
  for (const key of ['5', 'F2', 'Backspace']) {
    fireEvent.keyDown(boton, { key })
    expect(c.entrada(), key).toBeNull()
  }
}

// 4.13-3c: un candado por lado. El monto calculado de Transferencia no se edita; su porcentaje, sí.
describe('el candado por lado del par', () => {
  it('con el principal bloqueado, el porcentaje abre, confirma y emite su id; el monto no abre (clic, carácter, F2, Retroceso)', () => {
    const c = celda({ ...PAR, disabledReason: MOTIVO })
    expect(c.parada(0)?.getAttribute('aria-disabled')).toBe('true')
    expect(c.parada(1)?.hasAttribute('aria-disabled')).toBe(false)
    noAbre(c, 0)
    fireEvent.change(abrir(c, 1), { target: { value: '13' } })
    fireEvent.keyDown(c.entrada() as HTMLInputElement, { key: 'Enter' })
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('iva_pct', 0.13)
  })

  it('con el secundario bloqueado, lo mismo al revés', () => {
    const c = celda({ ...PAR, secondaryDisabledReason: OTRO })
    expect(c.parada(1)?.getAttribute('aria-disabled')).toBe('true')
    expect(c.parada(0)?.hasAttribute('aria-disabled')).toBe(false)
    noAbre(c, 1)
    fireEvent.change(abrir(c, 0), { target: { value: '200' } })
    fireEvent.keyDown(c.entrada() as HTMLInputElement, { key: 'Enter' })
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('iva', 200)
  })

  it('se bloquea el lado que se edita: la edición se va; se bloquea el otro: sigue', () => {
    const c = celda(PAR)
    const dibujar = (p: Partial<XCellProps>) => {
      c.rerender(<XCell {...BASE} {...PAR} {...p} onCommit={c.onCommit} onReset={c.onReset} />)
    }
    abrir(c, 1)
    dibujar({ disabledReason: MOTIVO })
    expect(c.entrada(), 'se bloqueó el otro').not.toBeNull()
    dibujar({ secondaryDisabledReason: OTRO })
    expect(c.entrada(), 'se bloqueó el que se edita').toBeNull()
    expect(c.onCommit).not.toHaveBeenCalled()
  })

  it('un lado bloqueado: sin `deshabilitado` y con ↺; los dos: con `deshabilitado` y sin ↺', () => {
    const uno = celda({ ...PAR, overridden: true, disabledReason: MOTIVO })
    expect(uno.raiz.dataset['estado']).not.toContain('deshabilitado')
    expect(uno.parada(12)).not.toBeNull()
    cleanup()
    const dos = celda({
      ...PAR,
      overridden: true,
      disabledReason: MOTIVO,
      secondaryDisabledReason: OTRO,
    })
    expect(dos.raiz.dataset['estado']).toContain('deshabilitado')
    expect(dos.parada(12)).toBeNull()
  })
})

describe('las notas del candado por lado', () => {
  it('`aria-describedby`: el lado bloqueado nombra su candado, el editable no; el mismo motivo en los dos, una nota', () => {
    const uno = celda({ ...PAR, disabledReason: MOTIVO })
    expect(descritoPor(uno, uno.parada(0))).toEqual([MOTIVO])
    expect(descritoPor(uno, uno.parada(1))).toEqual([])
    cleanup()
    const distintos = celda({ ...PAR, disabledReason: MOTIVO, secondaryDisabledReason: OTRO })
    expect(descritoPor(distintos, distintos.parada(0))).toEqual([MOTIVO])
    expect(descritoPor(distintos, distintos.parada(1))).toEqual([OTRO])
    cleanup()
    const iguales = celda({ ...PAR, disabledReason: MOTIVO, secondaryDisabledReason: MOTIVO })
    expect(iguales.raiz.querySelectorAll('p')).toHaveLength(1)
    expect(descritoPor(iguales, iguales.parada(0))).toEqual([MOTIVO])
    expect(descritoPor(iguales, iguales.parada(1))).toEqual([MOTIVO])
  })

  it('con un error y un lado bloqueado se ven las dos notas, y el error describe a los dos', () => {
    const ERROR = 'Tiene que estar entre 0 y 100.'
    const c = celda({ ...PAR, disabledReason: MOTIVO, error: ERROR })
    expect(c.raiz.querySelector('[role="alert"]')?.textContent).toBe(ERROR)
    expect(descritoPor(c, c.parada(0))).toEqual([ERROR, MOTIVO])
    expect(descritoPor(c, c.parada(1))).toEqual([ERROR])
  })

  it('con el monto bloqueado se abre el porcentaje: la entrada no nombra el candado; con «abc», nombra sólo el aviso', () => {
    const c = celda({ ...PAR, disabledReason: MOTIVO })
    const entrada = abrir(c, 1)
    expect(descritoPor(c, entrada)).toEqual([])
    fireEvent.change(entrada, { target: { value: 'abc' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(descritoPor(c, c.entrada())).toEqual(['Escribe un número, por ejemplo 1234,5.'])
  })
})
