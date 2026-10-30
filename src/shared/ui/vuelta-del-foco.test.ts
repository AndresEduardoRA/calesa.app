import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TOPE_DE_LA_VUELTA_MS,
  abrirConVuelta,
  buscarPorSenas,
  senasDe,
  useVueltaDelFoco,
} from './vuelta-del-foco'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.replaceChildren()
  history.replaceState(null, '')
})

function boton(texto: string, donde: Element = document.body): HTMLButtonElement {
  const b = document.createElement('button')
  b.textContent = texto
  donde.append(b)
  return b
}

describe('las señas de quien abrió', () => {
  it('lo encuentran por el camino', () => {
    const caja = document.createElement('div')
    document.body.append(caja)
    boton('Uno', caja)
    const dos = boton('Dos', caja)
    expect(buscarPorSenas(senasDe(dos))).toBe(dos)
  })

  it('si el camino cambió, lo encuentran por su nombre', () => {
    const dos = boton('Dos')
    const senas = senasDe(dos)
    document.body.prepend(document.createElement('nav'))
    expect(buscarPorSenas(senas)).toBe(dos)
  })

  it('no encuentran nada con dos candidatos o ninguno', () => {
    const dos = boton('Dos')
    const senas = senasDe(dos)
    document.body.prepend(document.createElement('nav'))
    boton('Dos')
    expect(buscarPorSenas(senas)).toBeNull()
    document.body.replaceChildren()
    expect(buscarPorSenas(senas)).toBeNull()
  })

  it('con la misma etiqueta y otro nombre en el camino, no encuentran nada', () => {
    const dos = boton('Dos')
    const senas = senasDe(dos)
    dos.textContent = 'Otro'
    expect(buscarPorSenas(senas)).toBeNull()
  })
})

// Abre `clave` con el foco en `quien`, como lo haría un hook: marca la entrada de antes, «escribe» la del panel (otro `history.state`) y devuelve el estado de
// la entrada de antes, para volver a ella con `volverA()`.
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

// «Atrás» a una entrada: el navegador pone su estado y dispara `popstate`.
function volverA(estado: unknown): void {
  history.replaceState(estado, '')
  window.dispatchEvent(new PopStateEvent('popstate', { state: estado }))
}

const cuadros = (n: number) => {
  for (let i = 0; i < n; i++) vi.advanceTimersToNextFrame()
}

describe('la vuelta del foco', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
  })

  it('un «atrás» a la entrada marcada enfoca a quien abrió, también si aparece cuadros después', async () => {
    renderHook(() => useVueltaDelFoco('a', true))
    const quien = boton('Avanzado')
    const antes = await abrirDesde('a', quien)
    quien.remove()
    volverA(antes)
    cuadros(3)
    expect(document.activeElement).toBe(document.body)
    const nuevo = boton('Avanzado')
    cuadros(1)
    expect(document.activeElement).toBe(nuevo)
  })

  it('con el foco en otro elemento no lo mueve', async () => {
    renderHook(() => useVueltaDelFoco('b', true))
    const quien = boton('Abrir')
    const otro = boton('Otro')
    const antes = await abrirDesde('b', quien)
    otro.focus()
    volverA(antes)
    cuadros(5)
    expect(document.activeElement).toBe(otro)
  })

  it('una tecla la corta', async () => {
    renderHook(() => useVueltaDelFoco('c', true))
    const quien = boton('Abrir')
    const antes = await abrirDesde('c', quien)
    quien.remove()
    volverA(antes)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    document.body.append(quien)
    cuadros(3)
    expect(document.activeElement).toBe(document.body)
  })

  it('el puntero la corta', async () => {
    renderHook(() => useVueltaDelFoco('d', true))
    const quien = boton('Abrir')
    const antes = await abrirDesde('d', quien)
    quien.remove()
    volverA(antes)
    window.dispatchEvent(new Event('pointerdown'))
    document.body.append(quien)
    cuadros(3)
    expect(document.activeElement).toBe(document.body)
  })

  it('si quien abrió aparece después del tope, no lo enfoca', async () => {
    renderHook(() => useVueltaDelFoco('e', true))
    const quien = boton('Abrir')
    const antes = await abrirDesde('e', quien)
    quien.remove()
    volverA(antes)
    vi.advanceTimersByTime(TOPE_DE_LA_VUELTA_MS + 100)
    document.body.append(quien)
    cuadros(3)
    expect(document.activeElement).toBe(document.body)
  })
})

describe('la vuelta del foco: cuándo no vuelve', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
  })

  it('sin «atrás» no mueve el foco: montarse con la entrada marcada no vuelve', async () => {
    const quien = boton('Abrir')
    const antes = await abrirDesde('f', quien)
    quien.blur()
    history.replaceState(antes, '')
    renderHook(() => useVueltaDelFoco('f', false))
    cuadros(5)
    expect(document.activeElement).toBe(document.body)
  })

  it('con otra ficha en la marca no mueve el foco', async () => {
    renderHook(() => useVueltaDelFoco('g', true))
    const quien = boton('Abrir')
    const antes = (await abrirDesde('g', quien)) as { vueltaDelFoco: Record<string, object> }
    quien.blur()
    volverA({
      ...antes,
      vueltaDelFoco: { g: { ...antes.vueltaDelFoco['g'], ficha: 'otra' } },
    })
    cuadros(5)
    expect(document.activeElement).toBe(document.body)
  })

  it('cerrarse de otra manera la olvida: un «atrás» posterior a la entrada marcada no mueve el foco', async () => {
    const quien = boton('Abrir')
    const { rerender } = renderHook(({ abierto }) => useVueltaDelFoco('h', abierto), {
      initialProps: { abierto: false },
    })
    const antes = await abrirDesde('h', quien)
    rerender({ abierto: true })
    // Otra escritura quita el panel (un replace que no es `cerrar()`): la entrada actual no es la marcada.
    rerender({ abierto: false })
    quien.blur()
    volverA(antes)
    cuadros(5)
    expect(document.activeElement).toBe(document.body)
  })

  it('verse cerrado ya en la entrada marcada no la olvida', async () => {
    const quien = boton('Abrir')
    const { rerender } = renderHook(({ abierto }) => useVueltaDelFoco('i', abierto), {
      initialProps: { abierto: false },
    })
    const antes = await abrirDesde('i', quien)
    rerender({ abierto: true })
    quien.blur()
    history.replaceState(antes, '')
    rerender({ abierto: false })
    volverA(antes)
    cuadros(2)
    expect(document.activeElement).toBe(quien)
  })

  it('dos claves: el diálogo de adentro vuelve a su botón y deja recordado el panel', async () => {
    renderHook(() => useVueltaDelFoco('panel-j', true))
    renderHook(() => useVueltaDelFoco('eliminar-j', true))
    const abrePanel = boton('Etapas')
    const antesDelPanel = await abrirDesde('panel-j', abrePanel)
    const abreEliminar = boton('Eliminar embudo')
    const delPanel = await abrirDesde('eliminar-j', abreEliminar)
    abreEliminar.blur()
    volverA(delPanel)
    cuadros(2)
    expect(document.activeElement).toBe(abreEliminar)
    abreEliminar.blur()
    volverA(antesDelPanel)
    cuadros(2)
    expect(document.activeElement).toBe(abrePanel)
  })
})

describe('la vuelta del foco: mientras se escribe la URL', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
  })

  it('un panel abierto desde otro con la misma clave no toma la ficha vieja de la entrada', async () => {
    const quien = boton('Otro panel')
    const { rerender } = renderHook(({ abierto }) => useVueltaDelFoco('k', abierto), {
      initialProps: { abierto: false },
    })
    // La entrada actual es la de otro panel, con su ficha; la escritura del nuevo todavía no terminó.
    history.replaceState({ vueltaDesde: { k: 'vieja' } }, '')
    quien.focus()
    let terminar = () => {}
    abrirConVuelta('k', () => new Promise<void>((listo) => (terminar = listo)))
    const marcada: unknown = history.state
    rerender({ abierto: true })
    terminar()
    await Promise.resolve()
    quien.blur()
    volverA(marcada)
    cuadros(2)
    expect(document.activeElement).toBe(quien)
  })

  it('si la escritura falla, el panel vuelve a recordar la ficha de su entrada', async () => {
    const quien = boton('Abrir')
    quien.focus()
    abrirConVuelta('m', () => Promise.reject(new Error('sin red')))
    const marcada = history.state as { vueltaDelFoco: Record<string, { ficha: string }> }
    await Promise.resolve()
    await Promise.resolve()
    const ficha = marcada.vueltaDelFoco['m']?.ficha
    history.replaceState({ vueltaDesde: { m: 'otra' } }, '')
    renderHook(() => useVueltaDelFoco('m', true))
    quien.blur()
    volverA({ vueltaDelFoco: { m: { ...marcada.vueltaDelFoco['m'], ficha: 'otra' } } })
    cuadros(2)
    expect(ficha).toEqual(expect.any(String))
    expect(document.activeElement).toBe(quien)
  })
})

describe('la vuelta del foco: una navegación del servidor', () => {
  it('si Next reescribe el estado de la entrada del panel, tras recargar la ficha sale de sessionStorage', async () => {
    sessionStorage.clear()
    vi.resetModules()
    const antes = await import('./vuelta-del-foco')
    const quien = boton('Editar')
    quien.focus()
    let marcada: unknown = null
    antes.abrirConVuelta('s', () => {
      marcada = history.state
      history.replaceState({ panel: 's' }, '')
      return Promise.resolve()
    })
    await Promise.resolve()
    // `shallow: false`: al llegar del servidor, Next pone su estado en la entrada y se lleva el resto. Después, recargar (el módulo de nuevo).
    history.replaceState({ __NA: true }, '')
    vi.resetModules()
    const despues = await import('./vuelta-del-foco')
    renderHook(() => {
      despues.useVueltaDelFoco('s', true)
    })
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
    quien.blur()
    volverA(marcada)
    cuadros(2)
    sessionStorage.clear()
    expect(document.activeElement).toBe(quien)
  })
})
