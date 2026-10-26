import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BASE, celda } from './xcell.soporte'
import { XCell, type XCellProps } from './index'
import type * as TextoDeValorReal from './texto-de-valor'

afterEach(cleanup)

describe('el tope de nodos', () => {
  const nodos = (props: Partial<XCellProps>) => {
    const c = celda(props)
    return c.raiz.querySelectorAll('*').length + 1
  }
  const PAR: Partial<XCellProps> = {
    secondaryId: 'p',
    secondaryFormat: 'porcentaje',
    secondaryValue: 0.1,
  }

  it('la celda sola, 8; un par, 9; la más cargada, 15 (lo medido en 4.12-1)', () => {
    expect(nodos({})).toBe(8)
    cleanup()
    expect(nodos(PAR)).toBe(9)
    cleanup()
    const cargadas: Partial<XCellProps>[] = [
      { ...PAR, overridden: true, error: 'Fuera de rango' },
      { ...PAR, suggested: true, disabledReason: 'Apagado por la variante' },
    ]
    for (const caso of cargadas) {
      expect(nodos(caso)).toBeLessThanOrEqual(15)
      cleanup()
    }
  })

  it('300 celdas, todas en el peor estado, caben en 4.500 nodos (15 por celda)', () => {
    const mezcla = (i: number): XCellProps => ({
      ...BASE,
      id: `n${String(i)}`,
      suggested: i % 3 === 0,
      overridden: i % 5 === 0,
      ...(i % 7 === 0 ? { disabledReason: 'Apagado' } : {}),
      ...(i % 4 === 0
        ? {
            secondaryId: `p${String(i)}`,
            secondaryFormat: 'porcentaje' as const,
            secondaryValue: 0.1,
          }
        : {}),
    })
    const { container } = render(
      <div>
        {Array.from({ length: 300 }, (_, i) => (
          <XCell key={i} {...mezcla(i)} />
        ))}
      </div>,
    )
    expect(container.querySelectorAll('*').length).toBeLessThanOrEqual(4500)
  })
})

// El contador de dibujos de la parte de abajo de la celda: cada vez que una celda se dibuja, el valor se vuelve a dibujar.
const dibujos = vi.hoisted(() => ({ n: 0 }))
vi.mock('./texto-de-valor', async (original) => {
  const real = await original<typeof TextoDeValorReal>()
  return {
    TextoDeValor: (props: Parameters<typeof real.TextoDeValor>[0]) => {
      dibujos.n += 1
      return real.TextoDeValor(props)
    },
  }
})

describe('300 celdas', () => {
  const onCommit = () => undefined
  const onReset = () => undefined

  function Hoja({ cambiada }: { cambiada: number }) {
    return (
      <div>
        {Array.from({ length: 300 }, (_, i) => (
          <XCell
            key={i}
            {...BASE}
            id={`n${String(i)}`}
            value={i === 42 ? cambiada : i}
            onCommit={onCommit}
            onReset={onReset}
          />
        ))}
      </div>
    )
  }

  it('montarlas no le roba el foco a nadie', () => {
    render(<Hoja cambiada={0} />)
    expect(document.activeElement).toBe(document.body)
  })

  it('cambiar una dibuja sólo esa (props primitivas y callbacks estables)', () => {
    const { rerender } = render(<Hoja cambiada={0} />)
    dibujos.n = 0
    rerender(<Hoja cambiada={1} />)
    expect(dibujos.n).toBe(1)
    dibujos.n = 0
    rerender(<Hoja cambiada={1} />)
    expect(dibujos.n).toBe(0)
  })

  it('editar una (con su estado propio) no dibuja a las otras', () => {
    function Contenedor() {
      const [veces, setVeces] = useState(0)
      return (
        <div>
          <button
            type="button"
            onClick={() => {
              setVeces(veces + 1)
            }}
          >
            sumar
          </button>
          <Hoja cambiada={0} />
        </div>
      )
    }
    render(<Contenedor />)
    dibujos.n = 0
    fireEvent.click(screen.getByText('sumar'))
    expect(dibujos.n).toBe(0)
  })
})
