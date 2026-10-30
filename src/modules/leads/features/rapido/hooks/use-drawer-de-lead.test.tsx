import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { senasDe } from '@/shared/ui/vuelta-del-foco'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { PANEL_ANOTAR_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import { CLAVE_DE_LEAD, useDrawerDeLead } from './use-drawer-de-lead'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

// El lead rápido (`?lead=<id>`), y encima «Editar» (`&panel=editar-lead`) o anotar desde el «⋯» del resumen
// (`&pestana=seguimientos&panel=anotar-seguimiento`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'useDrawerDeLead',
  usar: useDrawerDeLead,
  clave: CLAVE_DE_LEAD,
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (drawer) => {
        drawer.abrir(ID)
      },
      abierta: `?lead=${ID}`,
      abierto: (drawer) => drawer.id === ID,
    },
  ],
  cerrar: (drawer) => {
    drawer.cerrar()
  },
})

probarLaVuelta({
  hook: 'useDrawerDeLead',
  usar: useDrawerDeLead,
  clave: 'panel',
  cerrada: `?lead=${ID}`,
  aperturas: [
    {
      nombre: 'editar',
      abrir: (drawer) => {
        drawer.editar()
      },
      abierta: `?lead=${ID}&panel=${PANEL_EDITAR_LEAD}`,
      abierto: (drawer) => drawer.editando,
    },
    {
      nombre: 'abrirModal',
      abrir: (drawer) => {
        drawer.abrirModal('seguimientos', PANEL_ANOTAR_SEGUIMIENTO)
      },
      abierta: `?lead=${ID}&pestana=seguimientos&panel=${PANEL_ANOTAR_SEGUIMIENTO}`,
      abierto: (drawer) => drawer.pestana === 'seguimientos' && drawer.conModal,
    },
  ],
  cerrar: (drawer) => {
    drawer.elegirPestana('resumen')
  },
})

// Lo de abajo no entra en `probarLaVuelta`: el segundo «atrás» tras recargar con un panel encima (4-59).
const envoltura = (busqueda: string) =>
  function Envoltura({ children }: { children: ReactNode }) {
    return (
      <NuqsTestingAdapter searchParams={busqueda} hasMemory>
        {children}
      </NuqsTestingAdapter>
    )
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

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.replaceChildren()
  history.replaceState(null, '', '/')
})

it('montado con un panel encima (tras recargar), al quedar sin panel toma la ficha del lead y el segundo «atrás» devuelve el foco', async () => {
  const boton = botonConFoco()
  const senas = senasDe(boton)
  const { result } = renderHook(useDrawerDeLead, {
    wrapper: envoltura(`?lead=${ID}&panel=${PANEL_EDITAR_LEAD}`),
  })
  // La entrada `?lead=<id>` a la que lleva el primer «atrás», con la ficha de `lead`.
  history.replaceState({ vueltaDesde: { lead: 'f-tras-recargar' } }, '')
  act(() => {
    result.current.elegirPestana('resumen')
  })
  await waitFor(() => {
    expect(result.current.editando).toBe(false)
  })
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
  boton.blur()
  history.replaceState({ vueltaDelFoco: { lead: { ficha: 'f-tras-recargar', senas } } }, '')
  volverConPopstate()
  vi.advanceTimersToNextFrame()
  expect(document.activeElement).toBe(boton)
})

it('sin recargar, abrir un panel y cerrarlo en otra URL no olvida la ficha del lead', async () => {
  const boton = botonConFoco()
  const senas = senasDe(boton)
  history.replaceState({ vueltaDesde: { lead: 'f-sin-recargar' } }, '')
  const { result } = renderHook(useDrawerDeLead, { wrapper: envoltura(`?lead=${ID}`) })
  act(() => {
    result.current.editar()
  })
  await waitFor(() => {
    expect(result.current.editando).toBe(true)
  })
  // Cerrar con Esc reemplaza la entrada: otra URL, sin la ficha de `lead` ni guardada para ella.
  history.replaceState(null, '', `/?lead=${ID}&pestana=seguimientos`)
  act(() => {
    result.current.elegirPestana('seguimientos')
  })
  await waitFor(() => {
    expect(result.current.editando).toBe(false)
  })
  await act(() => new Promise((listo) => setTimeout(listo, 50)))
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'Date'] })
  boton.blur()
  history.replaceState({ vueltaDelFoco: { lead: { ficha: 'f-sin-recargar', senas } } }, '')
  volverConPopstate()
  vi.advanceTimersToNextFrame()
  expect(document.activeElement).toBe(boton)
})
