import { act, cleanup, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  desbordeHorizontal,
  desbordeVertical,
  useDesborde,
  useDesbordeVertical,
} from './use-desborde'

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

const medidas = (
  m: Partial<
    Record<
      'scrollLeft' | 'clientWidth' | 'scrollWidth' | 'scrollTop' | 'clientHeight' | 'scrollHeight',
      number
    >
  >,
) => ({
  scrollLeft: 0,
  clientWidth: 0,
  scrollWidth: 0,
  scrollTop: 0,
  clientHeight: 0,
  scrollHeight: 0,
  ...m,
})

describe('desbordeVertical y desbordeHorizontal: la medida pura', () => {
  it('lo que cabe no tiene nada que anunciar, y medio píxel de más no cuenta', () => {
    expect(desbordeVertical(medidas({ clientHeight: 400, scrollHeight: 400 }))).toEqual({
      arriba: false,
      abajo: false,
    })
    expect(desbordeVertical(medidas({ clientHeight: 400, scrollHeight: 400.5 }))).toEqual({
      arriba: false,
      abajo: false,
    })
    expect(desbordeHorizontal(medidas({ clientWidth: 300, scrollWidth: 300.5 }))).toEqual({
      izquierda: false,
      derecha: false,
    })
  })

  it('al principio sólo sigue hacia abajo; en el medio, a los dos lados; al final, sólo hacia arriba', () => {
    const base = { clientHeight: 400, scrollHeight: 900 }
    expect(desbordeVertical(medidas({ ...base, scrollTop: 0 }))).toEqual({
      arriba: false,
      abajo: true,
    })
    expect(desbordeVertical(medidas({ ...base, scrollTop: 200 }))).toEqual({
      arriba: true,
      abajo: true,
    })
    expect(desbordeVertical(medidas({ ...base, scrollTop: 500 }))).toEqual({
      arriba: true,
      abajo: false,
    })
    // Al final con tamaños fraccionarios (texto al 200 %): a 0,5 px del borde ya llegó.
    expect(desbordeVertical(medidas({ ...base, scrollTop: 499.5 }))).toEqual({
      arriba: true,
      abajo: false,
    })
  })
})

function Cuerpo({ medidas }: { medidas: { alto: number; visible: number; desplazado: number } }) {
  const ref = useRef<HTMLDivElement>(null)
  const desborde = useDesbordeVertical(ref)
  return (
    <>
      <div
        ref={(el) => {
          ref.current = el
          if (el) {
            Object.defineProperty(el, 'scrollHeight', { configurable: true, value: medidas.alto })
            Object.defineProperty(el, 'clientHeight', {
              configurable: true,
              value: medidas.visible,
            })
            el.scrollTop = medidas.desplazado
          }
        }}
        data-testid="cuerpo"
      />
      <p data-testid="estado">{`${String(desborde.arriba)}|${String(desborde.abajo)}`}</p>
    </>
  )
}

describe('useDesbordeVertical', () => {
  it('un cuerpo que cabe no dice nada; uno que desborda dice que sigue hacia abajo', () => {
    const { unmount } = render(<Cuerpo medidas={{ alto: 400, visible: 400, desplazado: 0 }} />)
    expect(screen.getByTestId('estado')).toHaveTextContent('false|false')
    unmount()
    render(<Cuerpo medidas={{ alto: 900, visible: 400, desplazado: 0 }} />)
    expect(screen.getByTestId('estado')).toHaveTextContent('false|true')
  })

  it('al desplazar hasta el final se vuelve a medir: ya no sigue hacia abajo y sí hacia arriba', () => {
    render(<Cuerpo medidas={{ alto: 900, visible: 400, desplazado: 0 }} />)
    const cuerpo = screen.getByTestId('cuerpo')
    act(() => {
      cuerpo.scrollTop = 500
      cuerpo.dispatchEvent(new Event('scroll'))
    })
    expect(screen.getByTestId('estado')).toHaveTextContent('true|false')
  })
})
