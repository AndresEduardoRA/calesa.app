import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, expect, it } from 'vitest'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { ACCIONES_DE_FILA } from '../../../entities/acciones-de-fila'
import { useAccionDeFila } from './use-accion-de-fila'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const OTRO = '7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d'

// Anotar o agendar desde el «⋯» de una fila (`?panel=…&para=<id>`): tras recargar con el modal abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'useAccionDeFila',
  usar: useAccionDeFila,
  clave: 'panel',
  cerrada: '',
  aperturas: (['anotar', 'agendar'] as const).map((accion) => ({
    nombre: `abrir('${accion}')`,
    abrir: (fila: ReturnType<typeof useAccionDeFila>) => {
      fila.abrir(accion, ID)
    },
    abierta: `?panel=${ACCIONES_DE_FILA[accion]}&para=${ID}`,
    abierto: (fila: ReturnType<typeof useAccionDeFila>) =>
      fila.accion === accion && fila.para === ID,
  })),
  cerrar: (fila) => {
    fila.cerrar()
  },
})

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  history.replaceState(null, '')
})

it('con la acción de una fila abierta, abrir la misma acción de otra fila marca la entrada', async () => {
  const { result } = renderHook(useAccionDeFila, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter searchParams={`?panel=${ACCIONES_DE_FILA.anotar}&para=${ID}`} hasMemory>
        {children}
      </NuqsTestingAdapter>
    ),
  })
  const boton = document.createElement('button')
  document.body.append(boton)
  boton.focus()
  act(() => {
    result.current.abrir('anotar', OTRO)
  })
  await waitFor(() => {
    expect(result.current.para).toBe(OTRO)
  })
  const marcas = (history.state as { vueltaDelFoco?: Record<string, { ficha: string }> } | null)
    ?.vueltaDelFoco
  expect(marcas?.[CLAVE_DE_PANEL]?.ficha).toEqual(expect.any(String))
})
