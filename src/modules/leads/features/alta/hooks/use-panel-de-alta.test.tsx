import { act, renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_NUEVO_LEAD, usePanelDeAlta } from './use-panel-de-alta'

// «Nuevo lead» (`?panel=nuevo-lead`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió (4-49).
probarLaVuelta({
  hook: 'usePanelDeAlta',
  usar: usePanelDeAlta,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (panel) => {
        panel.abrir()
      },
      abierta: `?panel=${PANEL_NUEVO_LEAD}`,
      abierto: (panel) => panel.abierto,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})

// «Nuevo lead» abierto desde el panel del cliente de la hoja (`?panel=nuevo-lead&elegir=lead`): la clave de la URL donde la hoja lleva su lead.
describe('usePanelDeAlta: elegir el creado', () => {
  function montar(url: string) {
    const cambios: UrlUpdateEvent[] = []
    const montado = renderHook(() => usePanelDeAlta(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NuqsTestingAdapter searchParams={url} onUrlUpdate={(c) => cambios.push(c)} hasMemory>
          {children}
        </NuqsTestingAdapter>
      ),
    })
    return { montado, cambios }
  }

  it('con el panel abierto y `elegir`, `paraElegir` es esa clave; sin el panel o sin `elegir`, nulo', () => {
    expect(montar(`?panel=${PANEL_NUEVO_LEAD}&elegir=lead`).montado.result.current.paraElegir).toBe(
      'lead',
    )
    expect(montar('?elegir=lead').montado.result.current.paraElegir).toBeNull()
    expect(montar(`?panel=${PANEL_NUEVO_LEAD}`).montado.result.current.paraElegir).toBeNull()
    expect(
      montar(`?panel=${PANEL_NUEVO_LEAD}&elegir=Lead%22`).montado.result.current.paraElegir,
    ).toBeNull()
  })

  it('cerrar quita `panel` y `elegir` en una sola escritura que reemplaza la entrada', async () => {
    const { montado, cambios } = montar(`?origen=o&panel=${PANEL_NUEVO_LEAD}&elegir=lead`)
    act(() => {
      montado.result.current.cerrar()
    })
    await waitFor(() => expect(cambios).toHaveLength(1))
    expect(cambios[0]?.queryString).toBe('?origen=o')
    expect(cambios[0]?.options.history).toBe('replace')
  })

  it('elegirElCreado(id) hace una sola escritura: el lead en su clave, sin `panel` ni `elegir`, en el servidor y reemplazando la entrada', async () => {
    const { montado, cambios } = montar(`?origen=o&panel=${PANEL_NUEVO_LEAD}&elegir=lead`)
    const id = '00000000-0000-4000-8000-000000000009'
    act(() => {
      montado.result.current.elegirElCreado(id)
    })
    await waitFor(() => expect(cambios).toHaveLength(1))
    expect(cambios[0]?.queryString).toBe(`?origen=o&lead=${id}`)
    expect(cambios[0]?.options.history).toBe('replace')
    expect(cambios[0]?.options.shallow).toBe(false)
  })

  it('sin `elegir`, elegirElCreado no escribe nada', async () => {
    const { montado, cambios } = montar(`?origen=o&panel=${PANEL_NUEVO_LEAD}`)
    act(() => {
      montado.result.current.elegirElCreado('00000000-0000-4000-8000-000000000009')
    })
    await act(() => new Promise((listo) => setTimeout(listo, 30)))
    expect(cambios).toHaveLength(0)
  })
})
