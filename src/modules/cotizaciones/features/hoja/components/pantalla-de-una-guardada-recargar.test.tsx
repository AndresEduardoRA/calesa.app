import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { RecalculoInicial } from '../../../entities/apertura'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { hojaDeUnaGuardadaDesde } from '../../../entities/hoja-de-una-guardada-lectura'
import {
  crudaDeUnaGuardada,
  ID_DE_LA_COTIZACION,
} from '../../../entities/hoja-de-una-guardada.soporte'
import { PantallaDeUnaGuardada } from './pantalla-de-una-guardada'

const { recalcular, ejecutar, refrescar } = vi.hoisted(() => ({
  recalcular: vi.fn(),
  ejecutar: vi.fn(),
  refrescar: vi.fn(),
}))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/guardar-cotizacion', () => ({ guardarCotizacion: {} }))
vi.mock('../../encima/actions/cotizar-encima', () => ({ cotizarEncima: {} }))

// «Recargar» en la hoja de una cotización guardada (4.15-3, C9): pide la lectura al servidor y, cuando llega, la hoja se vuelve a montar con ella aunque la versión de la
// cotización no se haya movido (`nodo_no_editable`, un recálculo que pide recargar). Sin eso la hoja conservaba lo que la base rechazó y el próximo «Guardar» caía igual.
const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const VALORES = { remate: 1000, variante: 'gasolina', cuenta: 0, total: 2350 }
const alDia = (usd: number): RecalculoInicial => ({
  respuesta: respuestaDePrueba({ usd, valores: VALORES }),
  estado: { tipo: 'al_dia' },
})
const lectura = () => {
  const hoja = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada())
  if (!hoja) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}
const envoltura = ({ children }: { children: ReactNode }) => (
  <NuqsTestingAdapter>
    <ProveedorAtajos>{children}</ProveedorAtajos>
  </NuqsTestingAdapter>
)
const pantalla = (inicial: RecalculoInicial) => (
  <PantallaDeUnaGuardada hoja={lectura()} inicial={inicial} personaId={PERSONA} />
)
const guardar = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Guardar' })

function tipear(nodo: string, texto: string) {
  const celda = document.querySelector(`[data-nodo="${nodo}"] [data-parada="0"]`)
  if (!celda) {
    throw new Error(`No hay la celda ${nodo}`)
  }
  fireEvent.click(celda)
  const entrada = document.querySelector<HTMLInputElement>(`[data-nodo="${nodo}"] input`)
  if (!entrada) {
    throw new Error('No se abrió la edición')
  }
  fireEvent.change(entrada, { target: { value: texto } })
  fireEvent.keyDown(entrada, { key: 'Enter' })
}

beforeEach(() => {
  window.sessionStorage.clear()
  recalcular.mockReset()
  ejecutar.mockReset()
  refrescar.mockReset()
  recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 7, valores: { ...VALORES, total: 7 } })))
})
afterEach(cleanup)

describe('«Recargar» sin que la versión de la cotización se mueva', () => {
  it('tras nodo_no_editable pide la lectura y, cuando llega, vuelve a montar la hoja con su borrador y sin el aviso', async () => {
    ejecutar.mockResolvedValue({
      data: { ok: true, data: { tipo: 'rechazo', motivo: 'recargar_hoja' } },
    })
    const { rerender } = render(pantalla(alDia(2350)), { wrapper: envoltura })
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    await screen.findByText(/Esta hoja ya no se puede guardar/)
    const antes = recalcular.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(refrescar).toHaveBeenCalledTimes(1)
    // El servidor devuelve la misma versión con otra lectura (objetos nuevos).
    rerender(pantalla(alDia(2350)))
    await waitFor(() => {
      expect(screen.queryByText(/Esta hoja ya no se puede guardar/)).toBeNull()
    })
    // La hoja se montó otra vez: el borrador de lo tipeado vuelve contra la lectura nueva y saca su recálculo (C9).
    await waitFor(() => {
      expect(recalcular.mock.calls.length).toBeGreaterThan(antes)
    })
  })

  it('un recálculo que pide recargar: «Recargar» lo limpia cuando llega la lectura nueva', async () => {
    recalcular.mockResolvedValue(fallo('sin_permiso', 'No tienes permiso.'))
    const { rerender } = render(pantalla(alDia(2350)), { wrapper: envoltura })
    tipear('remate', '1200')
    await screen.findByText('No se pudo recalcular.')
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(refrescar).toHaveBeenCalledTimes(1)
    recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 7, valores: VALORES })))
    window.sessionStorage.clear()
    rerender(pantalla(alDia(2350)))
    await waitFor(() => {
      expect(screen.queryByText('No se pudo recalcular.')).toBeNull()
    })
  })

  it('una lectura que llega sin que nadie haya pedido recargar no vuelve a montar la hoja (lo tipeado se queda)', async () => {
    const { rerender } = render(pantalla(alDia(2350)), { wrapper: envoltura })
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    window.sessionStorage.clear()
    rerender(pantalla(alDia(2350)))
    expect(guardar().disabled).toBe(false)
    expect(ID_DE_LA_COTIZACION).toBeTruthy()
  })
})
