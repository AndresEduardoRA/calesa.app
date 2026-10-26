import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BASE, celda } from './xcell.soporte'
import { XCell, type XCellProps } from './index'
import type * as TextoDeValorReal from './texto-de-valor'

afterEach(cleanup)

describe('el tope de nodos', () => {
  const onHelp = () => undefined
  const onSettings = () => undefined
  const nodos = (props: Partial<XCellProps>) => {
    const c = celda(props)
    return c.raiz.querySelectorAll('*').length + 1
  }
  const PAR: Partial<XCellProps> = {
    secondaryId: 'p',
    secondaryFormat: 'porcentaje',
    secondaryValue: 0.1,
  }

  const AYUDA: Partial<XCellProps> = { hasHelp: true, onHelp: () => undefined }
  const AJUSTES: Partial<XCellProps> = { hasSettings: true, onSettings: () => undefined }

  it('la celda sola, 8; un par, 9; la ayuda o el ⚙ suman 3 cada uno; la más cargada, 21 (4.12-1 y 4.12-2)', () => {
    expect(nodos({})).toBe(8)
    cleanup()
    expect(nodos(PAR)).toBe(9)
    cleanup()
    expect(nodos(AYUDA)).toBe(11)
    cleanup()
    expect(nodos(AJUSTES)).toBe(11)
    cleanup()
    expect(nodos({ ...AYUDA, ...AJUSTES })).toBe(14)
    cleanup()
    expect(nodos({ ...AYUDA, ...AJUSTES, overridden: true })).toBe(17)
    cleanup()
    expect(nodos({ ...AYUDA, ...AJUSTES, disabledReason: 'Apagado' })).toBe(17)
    cleanup()
    const cargadas: Partial<XCellProps>[] = [
      { ...PAR, overridden: true, error: 'Fuera de rango', ...AYUDA, ...AJUSTES },
      { ...PAR, suggested: true, disabledReason: 'Apagado por la variante', ...AYUDA, ...AJUSTES },
    ]
    for (const caso of cargadas) {
      expect(nodos(caso)).toBeLessThanOrEqual(21)
      cleanup()
    }
  })

  it('300 celdas, todas en el peor estado, caben en 3.500 nodos (la mezcla mide 3.368: 11 por celda; el peor estado, 21)', () => {
    const mezcla = (i: number): XCellProps => ({
      ...BASE,
      id: `n${String(i)}`,
      suggested: i % 3 === 0,
      overridden: i % 5 === 0,
      ...(i % 7 === 0 ? { disabledReason: 'Apagado' } : {}),
      ...(i % 3 === 0 ? { hasHelp: true, onHelp } : {}),
      ...(i % 6 === 0 ? { hasSettings: true, onSettings } : {}),
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
    expect(container.querySelectorAll('*').length).toBeLessThanOrEqual(3500)
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
  const onHelp = () => undefined
  const onSettings = () => undefined

  function Hoja({ cambiada }: { cambiada: number }) {
    return (
      <div>
        {Array.from({ length: 300 }, (_, i) => (
          <XCell
            key={i}
            {...BASE}
            id={`n${String(i)}`}
            value={i === 42 ? cambiada : i}
            hasHelp={i % 2 === 0}
            hasSettings={i % 3 === 0}
            onHelp={onHelp}
            onSettings={onSettings}
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
