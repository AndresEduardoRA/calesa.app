import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { senasDe } from '@/shared/ui/vuelta-del-foco'
import { usePanelDeNivel } from './use-panel-de-nivel'

// La vuelta del foco de «Nuevo nivel» (4-49): `NuqsTestingAdapter` no toca `window.history`, así que la marca de la entrada de antes y la ficha de la
// entrada del panel quedan en el mismo `history.state`.
type Estado = {
  vueltaDelFoco?: Record<string, { ficha: string }>
  vueltaDesde?: Record<string, string>
}
const estado = () => (history.state ?? {}) as Estado

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.replaceChildren()
  history.replaceState(null, '')
})

function envoltura(busqueda: string) {
  return function Envoltura({ children }: { children: ReactNode }) {
    return <NuqsTestingAdapter searchParams={busqueda}>{children}</NuqsTestingAdapter>
  }
}

function botonConFoco(): HTMLButtonElement {
  const boton = document.createElement('button')
  boton.textContent = 'Nuevo nivel'
  document.body.append(boton)
  boton.focus()
  return boton
}

const volverConPopstate = () => {
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
}

describe('usePanelDeNivel: la vuelta del foco', () => {
  it('abrirNuevo con el foco en un botón marca la entrada', async () => {
    botonConFoco()
    const { result } = renderHook(() => usePanelDeNivel(), { wrapper: envoltura('') })
    act(() => {
      result.current.abrirNuevo()
    })
    await waitFor(() => {
      expect(result.current.nuevo).toBe(true)
    })
    expect(estado().vueltaDelFoco?.['panel']?.ficha).toEqual(expect.any(String))
  })

  it('montado abierto tras recargar, recuerda la ficha: un «atrás» a la marcada devuelve el foco', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
    const boton = botonConFoco()
    const senas = senasDe(boton)
    history.replaceState({ vueltaDesde: { panel: 'f-nivel' } }, '')
    renderHook(() => usePanelDeNivel(), { wrapper: envoltura('?panel=nuevo-nivel') })
    boton.blur()
    history.replaceState({ vueltaDelFoco: { panel: { ficha: 'f-nivel', senas } } }, '')
    volverConPopstate()
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(boton)
  })

  it('cerrar() la olvida: un «atrás» posterior a la entrada marcada no mueve el foco', async () => {
    const boton = botonConFoco()
    const { result } = renderHook(() => usePanelDeNivel(), { wrapper: envoltura('') })
    act(() => {
      result.current.abrirNuevo()
    })
    await waitFor(() => {
      expect(estado().vueltaDesde?.['panel']).toBeDefined()
    })
    const marcada = structuredClone(estado())
    // La entrada del panel: la de antes es la que lleva la marca.
    history.replaceState({ vueltaDesde: marcada.vueltaDesde }, '')
    act(() => {
      result.current.cerrar()
    })
    await waitFor(() => {
      expect(result.current.nuevo).toBe(false)
    })
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
    boton.blur()
    history.replaceState(marcada, '')
    volverConPopstate()
    vi.advanceTimersToNextFrame()
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(document.body)
  })
})
