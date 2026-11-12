import { act, cleanup, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConteoAcotado } from '@/shared/lib/conteo'

// La campana pide su contador y su canal de Realtime con `diferido()`. Sin red al pedirlo, el código no llega:
// la prueba usa el `diferido()` de verdad sobre un cargador que falla dos veces (la carga y su reintento) y después
// resuelve, como un corte de red que se va.
let fallosQueQuedan = 0

vi.mock('../hooks/use-al-descansar', () => ({ useAlDescansar: () => true }))

vi.mock('./diferidos', async () => {
  const { diferido } = await import('@/shared/ui/diferido')
  function SuscripcionDePrueba({ alConteo }: { alConteo: (conteo: ConteoAcotado) => void }) {
    useEffect(() => {
      alConteo({ n: 1, hayMas: false })
    }, [alConteo])
    return null
  }
  return {
    ContenidoDeLaCampanaDiferido: () => null,
    SuscripcionDeLaCampanaDiferida: diferido(() => {
      if (fallosQueQuedan > 0) {
        fallosQueQuedan -= 1
        return Promise.reject(new Error('Failed to fetch dynamically imported module'))
      }
      return Promise.resolve(SuscripcionDePrueba)
    }),
  }
})

import { MENSAJE_SIN_CONEXION } from '@/shared/ui/diferido'
import { Campana } from './campana'

afterEach(cleanup)

describe('<Campana>', () => {
  it('la campana se suscribe sola cuando vuelve la red y el aviso sin conexión se va', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fallosQueQuedan = 2
    render(<Campana usuarioId="00000000-0000-4000-8000-0000000000aa" disponibles={[]} />)

    expect(await screen.findByText(MENSAJE_SIN_CONEXION, {}, { timeout: 3000 })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeTruthy()

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(
      await screen.findByRole('button', { name: /^Notificaciones, .+ sin leer$/ }),
    ).toBeTruthy()
    expect(screen.queryByText(MENSAJE_SIN_CONEXION)).toBeNull()
  })
})
