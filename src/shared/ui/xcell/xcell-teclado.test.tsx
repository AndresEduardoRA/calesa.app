import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrir, BASE, celda } from './xcell.soporte'
import { XCell, type XCellProps } from './index'

afterEach(cleanup)

describe('el teclado', () => {
  it('tipear un carácter abre la edición con ese carácter, y frena el keydown', () => {
    const c = celda()
    const boton = c.parada(0)
    if (!boton) throw new Error('sin botón')
    const sigue = fireEvent.keyDown(boton, { key: '5' })
    expect(sigue).toBe(false)
    expect(c.entrada()?.value).toBe('5')
    expect(document.activeElement).toBe(c.entrada())
  })

  it('Enter y el clic abren con el valor completo; Retroceso abre vacía', () => {
    const c = celda()
    expect(abrir(c).value).toBe('1234,567')
    cleanup()
    const d = celda()
    const boton = d.parada(0)
    if (!boton) throw new Error('sin botón')
    fireEvent.keyDown(boton, { key: 'Backspace' })
    expect(d.entrada()?.value).toBe('')
  })

  it('una combinación con Ctrl no abre la edición', () => {
    const c = celda()
    const boton = c.parada(0)
    if (!boton) throw new Error('sin botón')
    expect(fireEvent.keyDown(boton, { key: 's', ctrlKey: true })).toBe(true)
    expect(c.entrada()).toBeNull()
  })

  it('Esc cancela, vuelve al valor, devuelve el foco y no emite', () => {
    const c = celda()
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: '99' } })
    fireEvent.keyDown(entrada, { key: 'Escape' })
    expect(c.entrada()).toBeNull()
    expect(c.raiz.textContent).toContain('1.234,57')
    expect(document.activeElement).toBe(c.parada(0))
    expect(c.onCommit).not.toHaveBeenCalled()
  })

  it('Esc no sube al modal que contiene a la celda', () => {
    const alEsc = vi.fn()
    render(
      <div onKeyDown={alEsc}>
        <XCell {...BASE} />
      </div>,
    )
    const entrada = screen.getByRole('button', { name: /Fees/ })
    fireEvent.click(entrada)
    fireEvent.keyDown(document.querySelector('input') as HTMLInputElement, { key: 'Escape' })
    expect(alEsc).not.toHaveBeenCalled()
  })
})

describe('cerrar la edición', () => {
  it('Enter confirma, emite el id y el número, y devuelve el foco', () => {
    const c = celda()
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: '2000,5' } })
    const sigue = fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(sigue).toBe(false)
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('fees', 2000.5)
    expect(c.entrada()).toBeNull()
    expect(document.activeElement).toBe(c.parada(0))
  })

  it('Tab confirma SIN frenar el keydown (el navegador sigue a la celda que viene)', () => {
    const c = celda()
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: '7' } })
    const sigue = fireEvent.keyDown(entrada, { key: 'Tab' })
    expect(sigue).toBe(true)
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('fees', 7)
    // La entrada se va cuando pierde el foco, y no vuelve a emitir.
    fireEvent.blur(entrada)
    expect(c.entrada()).toBeNull()
    expect(c.onCommit).toHaveBeenCalledTimes(1)
  })

  it('un clic afuera confirma un número y descarta lo que no lo es', () => {
    const c = celda()
    fireEvent.change(abrir(c), { target: { value: '8' } })
    fireEvent.blur(c.entrada() as HTMLInputElement)
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('fees', 8)
    cleanup()
    const d = celda()
    fireEvent.change(abrir(d), { target: { value: 'abc' } })
    fireEvent.blur(d.entrada() as HTMLInputElement)
    expect(d.onCommit).not.toHaveBeenCalled()
    expect(d.entrada()).toBeNull()
  })
})

describe('lo tipeado', () => {
  it.each(['abc', 'Infinity', '1e999', '1,2,3'])(
    '«%s» no es un número: la edición sigue, con su aviso, y Enter y Tab no avanzan',
    (texto) => {
      const c = celda()
      const entrada = abrir(c)
      fireEvent.change(entrada, { target: { value: texto } })
      expect(fireEvent.keyDown(entrada, { key: 'Tab' })).toBe(false)
      fireEvent.keyDown(entrada, { key: 'Enter' })
      expect(c.entrada()?.value).toBe(texto)
      expect(c.entrada()?.getAttribute('aria-invalid')).toBe('true')
      const aviso = c.raiz.querySelector('[role="alert"]')
      expect(aviso?.textContent).toBe('Escribe un número, por ejemplo 1234,5.')
      expect(c.entrada()?.getAttribute('aria-describedby')).toBe(aviso?.id)
      expect(c.onCommit).not.toHaveBeenCalled()
    },
  )

  it('al seguir escribiendo el aviso se va', () => {
    const c = celda()
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: 'abc' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    fireEvent.change(entrada, { target: { value: '12' } })
    expect(c.raiz.querySelector('[role="alert"]')).toBeNull()
  })

  it('vacío emite null, y blancos también', () => {
    const c = celda()
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: '   ' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('fees', null)
  })

  it('vaciar una celda que ya estaba vacía no emite', () => {
    const c = celda({ value: null })
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: ' ' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(c.onCommit).not.toHaveBeenCalled()
  })

  it('el mensaje de la base llega por `error`, en la misma ranura', () => {
    const c = celda({ error: 'Tiene que ser menor que 100.' })
    expect(c.raiz.querySelector('[role="alert"]')?.textContent).toBe('Tiene que ser menor que 100.')
  })
})

describe('sin emisión falsa: abrir y salir sin tocar nada no emite', () => {
  const casos: [string, Partial<XCellProps>, string][] = [
    ['1234,567 (el valor tiene más decimales que la vista)', { value: 1234.567 }, '1234,567'],
    ['14,94 % (la fracción 0,1494)', { format: 'porcentaje', value: 0.1494 }, '14,94'],
    ['0,1 + 0,2 (ruido binario)', { value: 0.1 + 0.2 }, '0,3'],
    ['un valor vacío', { value: null }, ''],
  ]
  it.each(casos)('%s', (_nombre, props, abierto) => {
    for (const salida of ['Tab', 'Enter'] as const) {
      const c = celda(props)
      const entrada = abrir(c)
      expect(entrada.value).toBe(abierto)
      fireEvent.keyDown(entrada, { key: salida })
      expect(c.onCommit).not.toHaveBeenCalled()
      cleanup()
    }
  })

  it('reescribir el mismo número con otro texto tampoco emite', () => {
    const c = celda()
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: '1234,5670' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(c.onCommit).not.toHaveBeenCalled()
  })

  it('un sugerido no se vuelve override por pasar por la celda', () => {
    const c = celda({ suggested: true, value: 250.75 })
    const entrada = abrir(c)
    fireEvent.keyDown(entrada, { key: 'Tab' })
    expect(c.onCommit).not.toHaveBeenCalled()
  })
})

describe('el porcentaje', () => {
  it('se tipea en puntos y se emite como fracción', () => {
    const c = celda({ format: 'porcentaje', value: 0.1494 })
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: '15' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(c.onCommit).toHaveBeenCalledExactlyOnceWith('fees', 0.15)
  })
})
