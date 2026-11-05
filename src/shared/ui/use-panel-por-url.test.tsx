import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePanelPorUrl } from './use-panel-por-url'
import { senasDe } from './vuelta-del-foco'

afterEach(cleanup)

function envoltura(busqueda: string, alCambiar?: (evento: UrlUpdateEvent) => void) {
  return function Envoltura({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={alCambiar}>
        {children}
      </NuqsTestingAdapter>
    )
  }
}

describe('usePanelPorUrl', () => {
  it('está cerrado sin ?panel= y abierto con el suyo', () => {
    const cerrado = renderHook(() => usePanelPorUrl('purgar'), { wrapper: envoltura('') })
    expect(cerrado.result.current.abierto).toBe(false)
    const abierto = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('?panel=purgar'),
    })
    expect(abierto.result.current.abierto).toBe(true)
  })

  it('no responde al panel de otro', () => {
    const { result } = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('?panel=etapas'),
    })
    expect(result.current.abierto).toBe(false)
  })

  it('lee los valores que nombra la URL, y nulo los que faltan', () => {
    const { result } = renderHook(() => usePanelPorUrl('purgar', ['lote', 'lead']), {
      wrapper: envoltura('?panel=purgar&lote=L1'),
    })
    expect(result.current.valor('lote')).toBe('L1')
    expect(result.current.valor('lead')).toBeNull()
  })

  it('abrir suma al historial («atrás» lo cierra) y escribe el panel con sus valores', async () => {
    const eventos: UrlUpdateEvent[] = []
    const { result } = renderHook(() => usePanelPorUrl('purgar', ['lote']), {
      wrapper: envoltura('', (e) => eventos.push(e)),
    })
    act(() => {
      result.current.abrir({ lote: 'L1' })
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(true)
    })
    expect(result.current.valor('lote')).toBe('L1')
    const ultimo = eventos.at(-1)
    expect(ultimo?.options.history).toBe('push')
    expect(ultimo?.searchParams.get('panel')).toBe('purgar')
    expect(ultimo?.searchParams.get('lote')).toBe('L1')
  })

  it('cerrar quita el panel y sus valores, y deja lo demás de la URL', async () => {
    const eventos: UrlUpdateEvent[] = []
    const { result } = renderHook(() => usePanelPorUrl('purgar', ['lote']), {
      wrapper: envoltura('?panel=purgar&lote=L1&q=ana', (e) => eventos.push(e)),
    })
    act(() => {
      result.current.cerrar()
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(false)
    })
    const ultimo = eventos.at(-1)
    expect(ultimo?.searchParams.get('panel')).toBeNull()
    expect(ultimo?.searchParams.get('lote')).toBeNull()
    expect(ultimo?.searchParams.get('q')).toBe('ana')
  })
})

describe('usePanelPorUrl: escribir la URL', () => {
  it('abrir dos veces con la misma URL no escribe de más', async () => {
    const alCambiar = vi.fn()
    const { result } = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('', alCambiar),
    })
    act(() => {
      result.current.abrir()
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(true)
    })
    expect(alCambiar).toHaveBeenCalledTimes(1)
  })

  it('con otra clave vive junto a un ?panel= que ya está y no lo toca', async () => {
    const eventos: UrlUpdateEvent[] = []
    const { result } = renderHook(() => usePanelPorUrl('embudo', [], { clave: 'eliminar' }), {
      wrapper: envoltura('?panel=etapas', (e) => eventos.push(e)),
    })
    expect(result.current.abierto).toBe(false)
    act(() => {
      result.current.abrir()
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(true)
    })
    expect(eventos.at(-1)?.searchParams.get('panel')).toBe('etapas')
    expect(eventos.at(-1)?.searchParams.get('eliminar')).toBe('embudo')
    act(() => {
      result.current.cerrar()
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(false)
    })
    expect(eventos.at(-1)?.searchParams.get('panel')).toBe('etapas')
    expect(eventos.at(-1)?.searchParams.get('eliminar')).toBeNull()
  })
})

// La vuelta del foco (`vuelta-del-foco.ts`): `NuqsTestingAdapter` no toca `window.history`, así que la marca de la entrada de antes y la ficha de la entrada del
// panel quedan en el mismo `history.state`, que es lo que se mira.
type Estado = {
  __NA?: boolean
  ajena?: number
  vueltaDelFoco?: Record<string, { ficha: string }>
  vueltaDesde?: Record<string, string>
}
const estado = () => (history.state ?? {}) as Estado

function botonConFoco(): HTMLButtonElement {
  const boton = document.createElement('button')
  boton.textContent = 'Purgar'
  document.body.append(boton)
  boton.focus()
  return boton
}

function volverConPopstate(): void {
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
}

describe('usePanelPorUrl: la vuelta del foco', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
    history.replaceState(null, '')
  })

  it('abrir con el foco en un botón marca la entrada antes de escribir y conserva lo que había', async () => {
    history.replaceState({ __NA: true, ajena: 1 }, '')
    botonConFoco()
    let alEscribir: Estado | null = null
    const { result } = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('', () => {
        alEscribir = structuredClone(estado())
      }),
    })
    act(() => {
      result.current.abrir()
    })
    await waitFor(() => {
      expect(estado().vueltaDesde?.['panel']).toBeDefined()
    })
    const ficha = estado().vueltaDelFoco?.['panel']?.ficha
    expect(ficha).toEqual(expect.any(String))
    expect((alEscribir as Estado | null)?.vueltaDelFoco?.['panel']?.ficha).toBe(ficha)
    expect(estado().__NA).toBe(true)
    expect(estado().ajena).toBe(1)
    expect(estado().vueltaDesde?.['panel']).toBe(ficha)
  })

  it('con el foco en body no marca nada', async () => {
    const { result } = renderHook(() => usePanelPorUrl('purgar'), { wrapper: envoltura('') })
    act(() => {
      result.current.abrir()
    })
    await waitFor(() => {
      expect(result.current.abierto).toBe(true)
    })
    expect(history.state).toBeNull()
  })

  it('con el panel ya abierto, abrir otra vez no cambia history.state', async () => {
    history.replaceState({ __NA: true }, '')
    botonConFoco()
    const { result } = renderHook(() => usePanelPorUrl('purgar'), {
      wrapper: envoltura('?panel=purgar'),
    })
    act(() => {
      result.current.abrir()
    })
    await Promise.resolve()
    expect(history.state).toEqual({ __NA: true })
  })
})

describe('usePanelPorUrl: la vuelta del foco tras recargar y cerrar', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
    history.replaceState(null, '')
  })

  it('montado abierto tras recargar, recuerda la ficha de la entrada: un «atrás» a la marcada devuelve el foco', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
    const boton = botonConFoco()
    const senas = senasDe(boton)
    history.replaceState({ vueltaDesde: { panel: 'f-recargar' } }, '')
    renderHook(() => usePanelPorUrl('purgar'), { wrapper: envoltura('?panel=purgar') })
    boton.blur()
    history.replaceState({ vueltaDelFoco: { panel: { ficha: 'f-recargar', senas } } }, '')
    volverConPopstate()
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(boton)
  })

  it('cerrar() la olvida: un «atrás» posterior a la entrada marcada no mueve el foco', async () => {
    const boton = botonConFoco()
    const { result } = renderHook(() => usePanelPorUrl('purgar'), { wrapper: envoltura('') })
    act(() => {
      result.current.abrir()
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
      expect(result.current.abierto).toBe(false)
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
