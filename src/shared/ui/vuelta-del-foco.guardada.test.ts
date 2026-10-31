import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// La ficha guardada en `sessionStorage` (4.14-2a3): el respaldo de la de la entrada del panel cuando una navegación del servidor la borra del historial.
// Cada prueba «recarga» con un módulo nuevo (`vi.resetModules()`): la memoria de la página empieza vacía y `sessionStorage` sigue.

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.body.replaceChildren()
  sessionStorage.clear()
  history.replaceState(null, '', '/')
})

async function modulo() {
  vi.resetModules()
  return import('./vuelta-del-foco')
}

function botonConFoco(): HTMLButtonElement {
  const boton = document.createElement('button')
  boton.textContent = 'Editar'
  document.body.append(boton)
  boton.focus()
  return boton
}

// Abre `s` en `/panel`; devuelve el estado de la entrada de antes (la marcada).
async function abrir(): Promise<unknown> {
  const { abrirConVuelta } = await modulo()
  history.replaceState(null, '', '/panel')
  let marcada: unknown = null
  abrirConVuelta('s', () => {
    marcada = history.state
    history.replaceState({ panel: 's' }, '')
    return Promise.resolve()
  })
  await Promise.resolve()
  return marcada
}

async function recargarYVolver(marcada: unknown): Promise<void> {
  const { useVueltaDelFoco } = await modulo()
  renderHook(() => {
    useVueltaDelFoco('s', true)
  })
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
  ;(document.activeElement as HTMLElement | null)?.blur()
  history.replaceState(marcada, '')
  window.dispatchEvent(new PopStateEvent('popstate', { state: marcada }))
  vi.advanceTimersToNextFrame()
  vi.advanceTimersToNextFrame()
}

describe('la vuelta del foco: la ficha guardada', () => {
  it('la guardada en otra URL no se toma como la de la entrada', async () => {
    botonConFoco()
    const marcada = await abrir()
    // Next borra la ficha de la entrada, y la página que se recarga es otra.
    history.replaceState({ __NA: true }, '', '/otra')
    await recargarYVolver(marcada)
    expect(document.activeElement).toBe(document.body)
  })

  it('sin sessionStorage (lanza), abrir no se rompe y la ficha del historial alcanza', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('sin almacenamiento')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sin almacenamiento')
    })
    const boton = botonConFoco()
    const marcada = await abrir()
    await recargarYVolver(marcada)
    expect(document.activeElement).toBe(boton)
  })
})
