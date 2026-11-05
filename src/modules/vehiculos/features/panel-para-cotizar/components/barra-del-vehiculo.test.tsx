import { cleanup, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AltaDelPanel } from '../alta-del-panel'
import { BarraDelVehiculo } from './barra-del-vehiculo'

const panelMontado = vi.fn()
vi.mock('./diferidos', () => ({
  PanelDelVehiculoDiferido: (props: { alta: AltaDelPanel | null }) => {
    panelMontado(props)
    return null
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const ID = '00000000-0000-4000-8000-000000000001'

function montar(props: Partial<Parameters<typeof BarraDelVehiculo>[0]> = {}, url = '?origen=o') {
  render(
    <NuqsTestingAdapter searchParams={url}>
      <BarraDelVehiculo
        origenId="o"
        esSubasta
        elegido={null}
        alta={null}
        puedeVer
        claveDeLaUrl="vehiculo"
        cotizado={null}
        historial={null}
        {...props}
      />
    </NuqsTestingAdapter>,
  )
}

describe('BarraDelVehiculo', () => {
  it('sin vehículo invita a elegir uno', () => {
    montar()
    expect(screen.getByRole('button', { name: /Selecciona un vehículo/ })).toBeTruthy()
  })

  it('con vehículo dice su título, su número y su lote', () => {
    montar({
      elegido: { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: '4455', portadaRuta: null },
    })
    const boton = screen.getByRole('button', { name: /Toyota Corolla/ })
    expect(boton.textContent).toContain('#12 · Lote 4455')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('sin permiso para ver los vehículos del origen no ofrece elegir', () => {
    montar({ puedeVer: false })
    expect(screen.getByText('No puedes ver los vehículos de este origen.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('dice «Cotizado (n)» dentro del botón, sin sumar una parada de Tab', () => {
    const elegido = { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: null, portadaRuta: null }
    montar({ elegido, cotizado: '2' })
    const boton = screen.getByRole('button', { name: /Toyota Corolla/ })
    expect(boton.textContent).toContain('Cotizado (2)')
    expect(boton.getAttribute('aria-label') ?? boton.textContent).toContain('Cotizado (2)')
    expect(screen.getAllByRole('button')).toHaveLength(1)
    cleanup()
    montar({ elegido, cotizado: '20+' })
    expect(screen.getByRole('button', { name: /Toyota Corolla/ }).textContent).toContain(
      'Cotizado (20+)',
    )
  })

  it('no dice «Cotizado» sin conteo ni sin vehículo', () => {
    const elegido = { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: null, portadaRuta: null }
    montar({ elegido, cotizado: null })
    expect(screen.getByRole('button', { name: /Toyota Corolla/ }).textContent).not.toContain(
      'Cotizado',
    )
    cleanup()
    montar({ elegido: null, cotizado: '3' })
    expect(
      screen.getByRole('button', { name: /Selecciona un vehículo/ }).textContent,
    ).not.toContain('Cotizado')
  })

  it('le pasa al panel el alta que arma la página; sin alta, null', () => {
    const alta = {
      origen: { id: 'o', tipo: 'manual' },
      apibara: { activa: false, puedeConfigurar: false },
    } as unknown as AltaDelPanel
    montar({ alta }, '?origen=o&panel=vehiculo')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ alta }))
    cleanup()
    montar({}, '?origen=o&panel=vehiculo')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ alta: null }))
  })
})
