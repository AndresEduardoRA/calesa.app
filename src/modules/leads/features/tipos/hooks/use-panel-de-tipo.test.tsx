import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, expect, it } from 'vitest'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_EDITAR_TIPO, PANEL_NUEVO_TIPO } from '../../../entities/tipo-de-lead'
import { usePanelDeTipo } from './use-panel-de-tipo'

type Panel = ReturnType<typeof usePanelDeTipo>

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const OTRO = '7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d'

// «Nuevo tipo» y «Editar» (`?panel=nuevo-tipo`, `editar-tipo&tipo=<id>`): tras recargar con el modal abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeTipo',
  usar: usePanelDeTipo,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirNuevo',
      abrir: (panel: Panel) => {
        panel.abrirNuevo()
      },
      abierta: `?panel=${PANEL_NUEVO_TIPO}`,
      abierto: (panel: Panel) => panel.nuevo,
    },
    {
      nombre: 'abrirEdicion',
      abrir: (panel: Panel) => {
        panel.abrirEdicion(ID)
      },
      abierta: `?panel=${PANEL_EDITAR_TIPO}&tipo=${ID}`,
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

it('con la edición de un tipo abierta, abrir la de otro marca la entrada', async () => {
  const { result } = renderHook(usePanelDeTipo, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter searchParams={`?panel=${PANEL_EDITAR_TIPO}&tipo=${ID}`} hasMemory>
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
