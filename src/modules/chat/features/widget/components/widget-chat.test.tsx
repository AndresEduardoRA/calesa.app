import { act, cleanup, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// La burbuja pide su contador y su canal de Realtime con `diferido()`. Sin red al pedirlo, el código no llega y el aviso fijo
// «Sin conexión» queda encima de la pantalla (7-5: en el completo tapaba el «Reintentar» del resumen de vehículos). La prueba usa
// el `diferido()` de verdad sobre un cargador que falla dos veces (la carga y su reintento) y después resuelve, como un corte de
// red que se va.
let fallosQueQuedan = 0

vi.mock('next/navigation', () => ({ usePathname: () => '/vehiculos' }))
vi.mock('../hooks/use-al-descansar', () => ({ useAlDescansar: () => true }))

vi.mock('./diferidos', async () => {
  const { diferido } = await import('@/shared/ui/diferido')
  const { noLeidosStore } = await import('../no-leidos-store')
  function SuscripcionDePrueba() {
    useEffect(() => {
      noLeidosStore.poner(3)
    }, [])
    return null
  }
  return {
    PanelDelWidgetDiferido: () => null,
    SuscripcionDeNoLeidosDiferida: diferido(() => {
      if (fallosQueQuedan > 0) {
        fallosQueQuedan -= 1
        return Promise.reject(new Error('Failed to fetch dynamically imported module'))
      }
      return Promise.resolve(SuscripcionDePrueba)
    }),
  }
})

import { MENSAJE_SIN_CONEXION } from '@/shared/ui/diferido'
import { noLeidosStore } from '../no-leidos-store'
import { WidgetChat } from './widget-chat'

afterEach(() => {
  cleanup()
  noLeidosStore.reiniciar()
})

describe('<WidgetChat>', () => {
  it('la burbuja se suscribe sola cuando vuelve la red y el aviso sin conexión se va', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fallosQueQuedan = 2
    render(
      <WidgetChat
        usuarioId="00000000-0000-4000-8000-0000000000aa"
        zona="America/La_Paz"
        puedeModerar={false}
      />,
    )

    expect(await screen.findByText(MENSAJE_SIN_CONEXION, {}, { timeout: 3000 })).toBeTruthy()
    expect(screen.getAllByLabelText('Chat').length).toBeGreaterThan(0)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect((await screen.findAllByLabelText('Chat, 3 sin leer')).length).toBeGreaterThan(0)
    expect(screen.queryByText(MENSAJE_SIN_CONEXION)).toBeNull()
  })
})
