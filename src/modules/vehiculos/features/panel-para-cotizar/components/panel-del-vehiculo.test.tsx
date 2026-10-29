import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos, useAtajo } from '@/shared/ui/atajos'
import type { VehiculoDelPanel } from '../../../entities/panel-para-cotizar'
import { PanelDelVehiculo } from './panel-del-vehiculo'

vi.mock('next/navigation', () => ({
  usePathname: () => '/cotizaciones/nuevo',
  useSearchParams: () => new URLSearchParams('origen=o&lead=l&panel=vehiculo'),
}))

const ELEGIDO = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const vehiculo = (id: string, titulo: string): VehiculoDelPanel => ({
  id,
  numero: 3,
  titulo,
  anio: 2020,
  lote: '77',
  precio: null,
  cotizadoEn: '2026-10-29T08:00:00Z',
  cierreSubastaEn: null,
  portadaRuta: null,
})
vi.mock('../../../composicion.client', () => ({
  leerListaDelPanel: () =>
    Promise.resolve({
      ok: true,
      data: {
        filas: [vehiculo(ELEGIDO, 'Corolla elegido'), vehiculo(OTRO, 'Civic otro')],
        siguiente: null,
        anterior: null,
      },
    }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// La hoja registra «guardar» antes de que se abra el panel.
function Hoja({ alGuardar }: { alGuardar: () => void }) {
  useAtajo('guardar', alGuardar)
  return null
}

function montar({ esSubasta = true, alGuardar = vi.fn() } = {}) {
  const cambios: UrlUpdateEvent[] = []
  render(
    <NuqsTestingAdapter
      searchParams="?origen=o&lead=l&panel=vehiculo&lista=ultima"
      onUrlUpdate={(cambio) => cambios.push(cambio)}
      hasMemory
    >
      <ProveedorAtajos>
        <Hoja alGuardar={alGuardar} />
        <PanelDelVehiculo
          abierto
          alCerrar={vi.fn()}
          origenId="o"
          esSubasta={esSubasta}
          elegido={{
            id: ELEGIDO,
            numero: 3,
            titulo: 'Corolla elegido',
            lote: '77',
            portadaRuta: null,
          }}
          claveDeLaUrl="vehiculo"
        />
      </ProveedorAtajos>
    </NuqsTestingAdapter>,
  )
  return { alGuardar, cambios }
}

describe('PanelDelVehiculo', () => {
  it('en un origen de subasta tiene las dos pestañas; en otro, sólo «Últ. cotización»', async () => {
    montar()
    expect(await screen.findByRole('tab', { name: 'Cierre subasta' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    cleanup()
    montar({ esSubasta: false })
    await screen.findByText('Civic otro')
    expect(screen.queryByRole('tab', { name: 'Cierre subasta' })).toBeNull()
    expect(screen.queryByText('Cierre subasta')).toBeNull()
  })

  it('el elegido va arriba con «Quitar», y su tarjeta dice «Seleccionado»', async () => {
    const { cambios } = montar()
    const elegida = await screen.findByRole('button', { name: /Corolla elegido/, current: true })
    expect(elegida.textContent).toContain('Seleccionado')
    expect(
      screen.getByRole('button', { name: /Civic otro/ }).getAttribute('aria-current'),
    ).toBeNull()
    expect(screen.getByRole('region', { name: 'Elegido' }).textContent).toContain('Corolla elegido')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?origen=o&lead=l'))
  })

  it('elegir pone el vehículo y quita el panel, en el servidor y reemplazando la entrada de abrirlo', async () => {
    const { cambios } = montar()
    fireEvent.click(await screen.findByRole('button', { name: /Civic otro/ }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${OTRO}`),
    )
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).toBe(false)
  })

  it('con el panel abierto, Ctrl+S no guarda la hoja', async () => {
    const { alGuardar } = montar()
    await screen.findByText('Civic otro')
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(alGuardar).not.toHaveBeenCalled()
  })
})
