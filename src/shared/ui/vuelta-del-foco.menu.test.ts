import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { abrirConVuelta, senasDe, useVueltaDelFoco } from './vuelta-del-foco'

// Desde un menú, la vuelta va al botón del menú (4.14-2a3, C1). El DOM copia lo que midió la sonda del paso en Base UI 1.9.0 cuando corre una acción
// `despuesDeCerrar` (`docs/BITACORA.md`, 4.14-2a3): el foco sigue en el ítem, el menú sigue en el DOM con su `aria-labelledby`
// (el `id` del «⋯») y el «⋯» ya no lleva `aria-controls`.

type Marca = { ficha: string; senas: { etiqueta: string; nombre: number; camino: number[] } }
const marcaDe = (clave: string): Marca | undefined =>
  (history.state as { vueltaDelFoco?: Record<string, Marca> } | null)?.vueltaDelFoco?.[clave]

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.replaceChildren()
  history.replaceState(null, '')
})

function tresPuntos(id: string, nombre: string, controla?: string): HTMLButtonElement {
  const boton = document.createElement('button')
  boton.id = id
  boton.setAttribute('aria-haspopup', 'menu')
  boton.setAttribute('aria-label', `Más acciones de ${nombre}`)
  if (controla) {
    boton.setAttribute('aria-controls', controla)
  }
  document.body.append(boton)
  return boton
}

// El menú en su portal, con el foco en un ítem.
function menuConFocoEnElItem(id: string, etiquetadoPor?: string): HTMLElement {
  const menu = document.createElement('div')
  menu.id = id
  menu.setAttribute('role', 'menu')
  if (etiquetadoPor) {
    menu.setAttribute('aria-labelledby', etiquetadoPor)
  }
  const item = document.createElement('div')
  item.setAttribute('role', 'menuitem')
  item.tabIndex = -1
  item.textContent = 'Renombrar'
  menu.append(item)
  document.body.append(menu)
  item.focus()
  return item
}

const abrir = () => {
  abrirConVuelta('panel', () => Promise.resolve())
}

describe('abrirConVuelta desde un menú', () => {
  it('con el DOM de T, la marca lleva las señas del «⋯» que nombra el aria-labelledby del menú', () => {
    const boton = tresPuntos('disparador', 'Nivel A')
    menuConFocoEnElItem('menu', 'disparador')
    abrir()
    expect(marcaDe('panel')?.senas).toEqual(senasDe(boton))
  })

  it('sin aria-labelledby, el disparador sale del aria-controls', () => {
    const boton = tresPuntos('disparador', 'Nivel A', 'menu')
    menuConFocoEnElItem('menu')
    abrir()
    expect(marcaDe('panel')?.senas).toEqual(senasDe(boton))
  })

  it('sin disparador, las señas del foco', () => {
    const item = menuConFocoEnElItem('menu', 'no-existe')
    abrir()
    expect(marcaDe('panel')?.senas).toEqual(senasDe(item))
  })

  it('con dos «⋯» en la página, el que el menú nombra y no el primero', () => {
    tresPuntos('otro', 'Nivel B')
    const boton = tresPuntos('disparador', 'Nivel A')
    menuConFocoEnElItem('menu', 'disparador')
    abrir()
    expect(marcaDe('panel')?.senas).toEqual(senasDe(boton))
  })

  it('con el menú ya desmontado, un «atrás» a la entrada marcada enfoca el «⋯»', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
    // La página oye el historial desde que un panel usa la vuelta.
    renderHook(() => {
      useVueltaDelFoco('panel', false)
    })
    const boton = tresPuntos('disparador', 'Nivel A')
    const item = menuConFocoEnElItem('menu', 'disparador')
    abrir()
    const marcada = structuredClone(history.state as unknown)
    item.closest('[role="menu"]')?.remove()
    ;(document.activeElement as HTMLElement | null)?.blur()
    history.replaceState(marcada, '')
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(boton)
  })
})
