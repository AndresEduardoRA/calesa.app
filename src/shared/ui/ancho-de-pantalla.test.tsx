import { act, cleanup, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorDeAncho, useAlMenos } from './ancho-de-pantalla'

type Oyente = () => void

// Una pantalla de mentira de `ancho` px: `matchMedia('(min-width: Npx)')` calza si mide al menos eso.
function pantalla(inicial: number) {
  const oyentes = new Set<Oyente>()
  let ancho = inicial
  vi.stubGlobal('innerWidth', ancho)
  vi.stubGlobal(
    'matchMedia',
    vi.fn((consulta: string) => {
      const corte = Number(/min-width: (\d+)px/.exec(consulta)?.[1])
      return {
        get matches() {
          return ancho >= corte
        },
        addEventListener: (_: string, oyente: Oyente) => oyentes.add(oyente),
        removeEventListener: (_: string, oyente: Oyente) => oyentes.delete(oyente),
      }
    }),
  )
  return {
    girar: (nuevo: number) => {
      ancho = nuevo
      vi.stubGlobal('innerWidth', nuevo)
      oyentes.forEach((oyente) => {
        oyente()
      })
    },
  }
}

function Vista() {
  return <p>{useAlMenos(768) ? 'tabla' : 'tarjetas'}</p>
}

beforeEach(() => {
  vi.unstubAllGlobals()
  document.cookie = 'ancho=; Max-Age=0; Path=/'
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useAlMenos', () => {
  it('en el servidor dibuja lo que supuso la petición: una sola vista en el HTML', () => {
    expect(
      renderToString(
        <ProveedorDeAncho inicial={400}>
          <Vista />
        </ProveedorDeAncho>,
      ),
    ).toContain('tarjetas')
    expect(
      renderToString(
        <ProveedorDeAncho inicial={1280}>
          <Vista />
        </ProveedorDeAncho>,
      ),
    ).toContain('tabla')
  })

  it('en el cliente sigue a la pantalla, y al girarla cambia de vista', () => {
    const p = pantalla(412)
    render(
      <ProveedorDeAncho inicial={412}>
        <Vista />
      </ProveedorDeAncho>,
    )
    expect(screen.getByText('tarjetas')).toBeTruthy()
    act(() => {
      p.girar(915)
    })
    expect(screen.getByText('tabla')).toBeTruthy()
  })

  it('deja el ancho en la cookie al montar y cada vez que cruza un corte', () => {
    const p = pantalla(412)
    render(
      <ProveedorDeAncho inicial={1280}>
        <Vista />
      </ProveedorDeAncho>,
    )
    expect(document.cookie).toContain('ancho=412')
    act(() => {
      p.girar(915)
    })
    expect(document.cookie).toContain('ancho=915')
  })
})
