import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IrAUnaFecha } from './ir-a-una-fecha'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function montar(zona = 'America/La_Paz', ocupado = false) {
  const alIr = vi.fn()
  render(<IrAUnaFecha zona={zona} ocupado={ocupado} alIr={alIr} />)
  const campo = screen.getByLabelText('Ir a una fecha')
  const ir = screen.getByRole('button', { name: 'Ir' })
  return { alIr, campo, ir }
}

describe('<IrAUnaFecha>', () => {
  it('la etiqueta nombra un campo de fecha vacío y «Ir» empieza apagado', () => {
    const { campo, ir } = montar()
    expect(campo.getAttribute('type')).toBe('date')
    expect((campo as HTMLInputElement).value).toBe('')
    expect((ir as HTMLButtonElement).disabled).toBe(true)
  })

  it('el máximo es hoy en la zona que recibe', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-06T02:30:00Z'))
    expect(montar('America/La_Paz').campo.getAttribute('max')).toBe('2026-11-05')
    cleanup()
    expect(montar('UTC').campo.getAttribute('max')).toBe('2026-11-06')
  })

  it('con un día, «Ir» se enciende y entrega ese día, no un instante', () => {
    const { alIr, campo, ir } = montar()
    fireEvent.change(campo, { target: { value: '2026-10-13' } })
    expect((ir as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(ir)
    expect(alIr).toHaveBeenCalledTimes(1)
    expect(alIr).toHaveBeenCalledWith('2026-10-13')
  })

  it('ocupado, «Ir» se apaga aun con día; enviar sin día no llama a nadie', () => {
    const ocupado = montar('America/La_Paz', true)
    fireEvent.change(ocupado.campo, { target: { value: '2026-10-13' } })
    expect((ocupado.ir as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    const libre = montar()
    const formulario = libre.ir.closest('form')
    expect(formulario).not.toBeNull()
    if (formulario !== null) {
      fireEvent.submit(formulario)
    }
    expect(libre.alIr).not.toHaveBeenCalled()
  })
})
