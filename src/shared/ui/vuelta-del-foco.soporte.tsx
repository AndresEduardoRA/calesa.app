import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { senasDe } from './vuelta-del-foco'

// Sólo de las pruebas: la vuelta del foco (4-49) de un hook que abre su panel escribiendo la URL a mano. `NuqsTestingAdapter` no toca
// `window.history`, así que la marca de la entrada de antes y la ficha de la entrada del panel quedan en el mismo `history.state`. Con `hasMemory`: un hook
// que escribe en una transición (`useFiltros`) vuelve a leer la búsqueda del adaptador, y sin memoria el panel se cerraría solo.

type Estado = {
  vueltaDelFoco?: Record<string, { ficha: string }>
  vueltaDesde?: Record<string, string>
}
const estado = () => (history.state ?? {}) as Estado

export type AperturaDeLaVuelta<T> = {
  // El nombre de la función que abre («abrirPanel», «editar»).
  nombre: string
  abrir: (hook: T) => void
  // La búsqueda con el panel abierto por esa función («?panel=filtros»).
  abierta: string
  abierto: (hook: T) => boolean
}

export type CasoDeLaVuelta<T> = {
  // El nombre del hook, para los títulos.
  hook: string
  usar: () => T
  clave: string
  // La búsqueda con el panel cerrado.
  cerrada: string
  aperturas: AperturaDeLaVuelta<T>[]
  cerrar: (hook: T) => void
}

function envoltura(busqueda: string) {
  return function Envoltura({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={busqueda} hasMemory>
        {children}
      </NuqsTestingAdapter>
    )
  }
}

function botonConFoco(): HTMLButtonElement {
  const boton = document.createElement('button')
  boton.textContent = 'Quien abre'
  document.body.append(boton)
  boton.focus()
  return boton
}

const volverConPopstate = () => {
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
}

const fakeCuadros = () => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
}

// Espera la condición y que siga cumpliéndose cuando terminan las transiciones: un hook que escribe en una (`useFiltros`) pasa un instante por el
// valor de antes.
async function hastaQueQuede(condicion: () => void): Promise<void> {
  await waitFor(condicion)
  await act(() => new Promise((listo) => setTimeout(listo, 50)))
  await waitFor(condicion)
}

// Abre con el foco en un botón y espera la marca de la entrada de antes.
async function abrirConMarca<T>(caso: CasoDeLaVuelta<T>, apertura: AperturaDeLaVuelta<T>) {
  const boton = botonConFoco()
  const montado = renderHook(caso.usar, { wrapper: envoltura(caso.cerrada) })
  act(() => {
    apertura.abrir(montado.result.current)
  })
  await waitFor(() => {
    expect(apertura.abierto(montado.result.current)).toBe(true)
  })
  await waitFor(() => {
    expect(estado().vueltaDelFoco?.[caso.clave]?.ficha).toEqual(expect.any(String))
  })
  return { boton, ...montado }
}

// Las cuatro pruebas de cada función que abre: marca, vuelve tras recargar, cerrar olvida y abrir lo abierto no marca otra vez.
export function probarLaVuelta<T>(caso: CasoDeLaVuelta<T>): void {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    document.body.replaceChildren()
    history.replaceState(null, '')
  })

  for (const apertura of caso.aperturas) {
    describe(`${caso.hook}: la vuelta del foco de ${apertura.nombre}`, () => {
      it('abrir con el foco en un botón marca la entrada', async () => {
        await abrirConMarca(caso, apertura)
      })

      it('montado abierto tras recargar, un «atrás» a la entrada marcada devuelve el foco', () => {
        fakeCuadros()
        const boton = botonConFoco()
        const senas = senasDe(boton)
        history.replaceState({ vueltaDesde: { [caso.clave]: 'f-recargada' } }, '')
        renderHook(caso.usar, { wrapper: envoltura(apertura.abierta) })
        boton.blur()
        history.replaceState(
          { vueltaDelFoco: { [caso.clave]: { ficha: 'f-recargada', senas } } },
          '',
        )
        volverConPopstate()
        vi.advanceTimersToNextFrame()
        expect(document.activeElement).toBe(boton)
      })

      it('cerrar la olvida: un «atrás» posterior a la entrada marcada no mueve el foco', async () => {
        const { boton, result } = await abrirConMarca(caso, apertura)
        await waitFor(() => {
          expect(estado().vueltaDesde?.[caso.clave]).toBeDefined()
        })
        const marcada = structuredClone(estado())
        // La entrada del panel: la de antes es la que lleva la marca.
        history.replaceState({ vueltaDesde: marcada.vueltaDesde }, '')
        act(() => {
          caso.cerrar(result.current)
        })
        await hastaQueQuede(() => {
          expect(apertura.abierto(result.current)).toBe(false)
        })
        fakeCuadros()
        boton.blur()
        history.replaceState(marcada, '')
        volverConPopstate()
        vi.advanceTimersToNextFrame()
        vi.advanceTimersToNextFrame()
        expect(document.activeElement).toBe(document.body)
      })

      it('abrir con el panel ya abierto no marca otra vez', async () => {
        const { result } = await abrirConMarca(caso, apertura)
        await waitFor(() => {
          expect(estado().vueltaDesde?.[caso.clave]).toBeDefined()
        })
        const antes = JSON.stringify(history.state)
        act(() => {
          apertura.abrir(result.current)
        })
        await waitFor(() => {
          expect(apertura.abierto(result.current)).toBe(true)
        })
        expect(JSON.stringify(history.state)).toBe(antes)
      })
    })
  }
}
