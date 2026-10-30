import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, expect, it } from 'vitest'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_EDITAR_ORIGEN, PANEL_NUEVO_ORIGEN } from '../../../entities/origen-de-lead'
import { usePanelDeOrigen } from './use-panel-de-origen'

type Panel = ReturnType<typeof usePanelDeOrigen>

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const OTRO = '7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d'

// «Nuevo origen» y «Editar» (`?panel=nuevo-origen`, `editar-origen&origen=<id>`): tras recargar con el modal abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeOrigen',
  usar: usePanelDeOrigen,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirNuevo',
      abrir: (panel: Panel) => {
        panel.abrirNuevo()
      },
      abierta: `?panel=${PANEL_NUEVO_ORIGEN}`,
      abierto: (panel: Panel) => panel.nuevo,
    },
    {
      nombre: 'abrirEdicion',
      abrir: (panel: Panel) => {
        panel.abrirEdicion(ID)
      },
      abierta: `?panel=${PANEL_EDITAR_ORIGEN}&origen=${ID}`,
      abierto: (panel: Panel) => panel.editando === ID,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  history.replaceState(null, '')
})

it('con la edición de un origen abierta, abrir la de otro marca la entrada', async () => {
  const { result } = renderHook(usePanelDeOrigen, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter searchParams={`?panel=${PANEL_EDITAR_ORIGEN}&origen=${ID}`} hasMemory>
        {children}
      </NuqsTestingAdapter>
    ),
  })
  const boton = document.createElement('button')
  document.body.append(boton)
  boton.focus()
  act(() => {
    result.current.abrirEdicion(OTRO)
  })
  await waitFor(() => {
    expect(result.current.editando).toBe(OTRO)
  })
  const marcas = (history.state as { vueltaDelFoco?: Record<string, { ficha: string }> } | null)
    ?.vueltaDelFoco
  expect(marcas?.[CLAVE_DE_PANEL]?.ficha).toEqual(expect.any(String))
})
