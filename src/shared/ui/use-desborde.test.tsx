import { act, cleanup, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDesborde } from './use-desborde'

class ObservadorFalso {
  static ultimo: ObservadorFalso | null = null
  constructor(readonly alCambiar: () => void) {
    ObservadorFalso.ultimo = this
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ObservadorFalso)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Barra({ medidas }: { medidas: { ancho: number; visible: number; desplazado: number } }) {
  const ref = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(ref)
  return (
    <>
      <ul
        ref={(el) => {
          ref.current = el
          if (el) {
            Object.defineProperty(el, 'scrollWidth', { configurable: true, value: medidas.ancho })
            Object.defineProperty(el, 'clientWidth', { configurable: true, value: medidas.visible })
            el.scrollLeft = medidas.desplazado
          }
        }}
        data-testid="barra"
      />
      <p data-testid="estado">{`${String(desborde.izquierda)}|${String(desborde.derecha)}`}</p>
    </>
  )
}

describe('useDesborde', () => {
  it('lo que cabe no tiene nada que anunciar', () => {
    render(<Barra medidas={{ ancho: 300, visible: 300, desplazado: 0 }} />)
    expect(screen.getByTestId('estado')).toHaveTextContent('false|false')
  })

  it('con más a la derecha, al principio, lo dice a la derecha', () => {
    render(<Barra medidas={{ ancho: 600, visible: 300, desplazado: 0 }} />)
    expect(screen.getByTestId('estado')).toHaveTextContent('false|true')
  })

  it('en el medio hay más a los dos lados, y al final sólo a la izquierda', () => {
    const { unmount } = render(<Barra medidas={{ ancho: 600, visible: 300, desplazado: 100 }} />)
    expect(screen.getByTestId('estado')).toHaveTextContent('true|true')
    unmount()
    render(<Barra medidas={{ ancho: 600, visible: 300, desplazado: 300 }} />)
    expect(screen.getByTestId('estado')).toHaveTextContent('true|false')
  })

  it('al desplazar se vuelve a medir, y al cambiar el tamaño también', () => {
    render(<Barra medidas={{ ancho: 600, visible: 300, desplazado: 0 }} />)
    const barra = screen.getByTestId('barra')
    act(() => {
      barra.scrollLeft = 300
      barra.dispatchEvent(new Event('scroll'))
    })
    expect(screen.getByTestId('estado')).toHaveTextContent('true|false')
    act(() => {
      Object.defineProperty(barra, 'clientWidth', { configurable: true, value: 600 })
      barra.scrollLeft = 0
      ObservadorFalso.ultimo?.alCambiar()
    })
    expect(screen.getByTestId('estado')).toHaveTextContent('false|false')
  })
})
