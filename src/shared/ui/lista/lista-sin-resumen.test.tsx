import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FilaDeLista, TarjetaDeLista } from '.'

afterEach(cleanup)

// Una lista sin resumen (la del equipo: cada persona se gestiona desde su «⋯») usa la misma fila y la misma tarjeta, sin `alAbrir`: no
// promete un clic que no hace nada.
describe('una fila y una tarjeta sin resumen', () => {
  it('la fila no es un objetivo de clic: sin cursor de mano', () => {
    render(
      <table>
        <tbody>
          <FilaDeLista>
            <td data-testid="celda">+591 70011002</td>
          </FilaDeLista>
        </tbody>
      </table>,
    )
    expect(document.querySelector('tr')?.className).not.toContain('cursor-pointer')
    // Un clic en una celda no rompe nada: no hay a quién avisarle.
    fireEvent.click(screen.getByTestId('celda'))
  })

  it('con resumen, la fila sí lleva el cursor de mano', () => {
    render(
      <table>
        <tbody>
          <FilaDeLista alAbrir={vi.fn()}>
            <td>x</td>
          </FilaDeLista>
        </tbody>
      </table>,
    )
    expect(document.querySelector('tr')?.className).toContain('cursor-pointer')
  })

  it('la tarjeta tampoco lo lleva, y sus acciones siguen siendo suyas', () => {
    const alMenu = vi.fn()
    render(
      <ul>
        <TarjetaDeLista
          acciones={
            <button type="button" onClick={alMenu}>
              Más
            </button>
          }
        >
          <span>+591</span>
        </TarjetaDeLista>
      </ul>,
    )
    expect(document.querySelector('article')?.className).not.toContain('cursor-pointer')
    fireEvent.click(screen.getByRole('button', { name: 'Más' }))
    expect(alMenu).toHaveBeenCalledTimes(1)
  })

  it('con resumen, la tarjeta sí lleva el cursor de mano', () => {
    render(
      <ul>
        <TarjetaDeLista alAbrir={vi.fn()}>
          <span>+591</span>
        </TarjetaDeLista>
      </ul>,
    )
    expect(document.querySelector('article')?.className).toContain('cursor-pointer')
  })
})
