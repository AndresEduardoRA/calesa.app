import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPE_DE_LA_VUELTA_MS, abrirConVuelta, useVueltaDelFoco } from './vuelta-del-foco'

// La respuesta del servidor a un «atrás» tras recargar vuelve a montar la hoja ~50 ms después de devolver el foco: el botón viejo se va con el foco y llega uno
// nuevo. La vuelta sigue mirando hasta el tope para devolvérselo al nuevo, y se corta con lo que ya la cortaba (tecla, puntero, otro «atrás»).

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.replaceChildren()
  sessionStorage.clear()
  history.replaceState(null, '')
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
})

function boton(texto: string): HTMLButtonElement {
  const b = document.createElement('button')
  b.textContent = texto
  document.body.append(b)
  return b
}

// Abre `clave` con el foco en `quien` y devuelve el estado de la entrada de antes, para volver a ella.
async function abrirDesde(clave: string, quien: HTMLElement): Promise<unknown> {
  quien.focus()
  let antes: unknown = null
  abrirConVuelta(clave, () => {
    antes = history.state
    history.replaceState({ panel: clave }, '')
    return Promise.resolve()
  })
  await Promise.resolve()
  return antes
}

function volverA(estado: unknown): void {
  history.replaceState(estado, '')
  window.dispatchEvent(new PopStateEvent('popstate', { state: estado }))
}

const cuadros = (n: number) => {
  for (let i = 0; i < n; i++) vi.advanceTimersToNextFrame()
}

describe('la vuelta del foco: si quien abrió se vuelve a crear', () => {
  it('después de recibir el foco, el foco vuelve al botón nuevo', async () => {
    renderHook(() => useVueltaDelFoco('f', true))
    const quien = boton('Avanzado')
    const antes = await abrirDesde('f', quien)
    volverA(antes)
    cuadros(1)
    expect(document.activeElement).toBe(quien)
    quien.remove()
    cuadros(2)
    expect(document.activeElement).toBe(document.body)
    const nuevo = boton('Avanzado')
    cuadros(1)
    expect(document.activeElement).toBe(nuevo)
  })

  it('con el foco ya devuelto, otro elemento que lo toma después se respeta', async () => {
    renderHook(() => useVueltaDelFoco('g', true))
    const quien = boton('Abrir')
    const otro = boton('Otro')
    const antes = await abrirDesde('g', quien)
    volverA(antes)
    cuadros(1)
    expect(document.activeElement).toBe(quien)
    otro.focus()
    quien.remove()
    cuadros(3)
    boton('Abrir')
    cuadros(3)
    expect(document.activeElement).toBe(otro)
  })

  it('una tecla corta la vigilancia de un foco ya devuelto', async () => {
    renderHook(() => useVueltaDelFoco('h', true))
    const quien = boton('Abrir')
    const antes = await abrirDesde('h', quien)
    volverA(antes)
    cuadros(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    quien.remove()
    cuadros(2)
    boton('Abrir')
    cuadros(3)
    expect(document.activeElement).toBe(document.body)
  })

  it('después del tope no recibe el foco', async () => {
    renderHook(() => useVueltaDelFoco('i', true))
    const quien = boton('Abrir')
    const antes = await abrirDesde('i', quien)
    volverA(antes)
    cuadros(1)
    expect(document.activeElement).toBe(quien)
    vi.advanceTimersByTime(TOPE_DE_LA_VUELTA_MS + 100)
    quien.remove()
    boton('Abrir')
    cuadros(3)
    expect(document.activeElement).toBe(document.body)
  })

  it('un «atrás» nuevo deja sin efecto la vigilancia del anterior', async () => {
    renderHook(() => useVueltaDelFoco('j', true))
    const quien = boton('Abrir')
    const antes = await abrirDesde('j', quien)
    volverA(antes)
    cuadros(1)
    expect(document.activeElement).toBe(quien)
    // Otro «atrás» (a una entrada sin marca): lo de `quien` ya no importa.
    volverA({ otra: 'entrada' })
    quien.remove()
    cuadros(2)
    boton('Abrir')
    cuadros(3)
    expect(document.activeElement).toBe(document.body)
  })
})
