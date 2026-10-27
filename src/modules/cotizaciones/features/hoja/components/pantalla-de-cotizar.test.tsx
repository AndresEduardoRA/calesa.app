import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecalculoInicial } from '../../../entities/apertura'
import { claveDelPendiente } from '../../../entities/claves-de-la-hoja'
import type { ResultadoDeCrear } from '../../../entities/guardado'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { HojaLista } from '../../../entities/hoja'
import type { PedidoDeGuardado } from '../../../entities/pedido-de-guardado'
import { PantallaDeCotizar } from './pantalla-de-cotizar'

const ejecutar = vi.hoisted(() => vi.fn())
const refrescar = vi.hoisted(() => vi.fn())
const avisar = vi.hoisted(() => vi.fn())
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/crear-cotizacion', () => ({ crearCotizacion: {} }))
vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
vi.mock('@/shared/ui/toasts', () => ({ avisar }))

// El marco de la hoja (paso 4.13-3b): lo guardado, los avisos del intento y la instantánea que no cambia a medio guardar.
const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const LEAD = '1b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const INICIAL: RecalculoInicial = {
  respuesta: respuestaDePrueba({ usd: 2350 }),
  estado: { tipo: 'al_dia' },
}
const guardada = (repetido: boolean, totalUsd = 1234) => ({
  data: {
    ok: true,
    data: {
      tipo: 'guardada',
      cotizacion: { id: ID, numero: 41, totalUsd, repetido },
    } satisfies ResultadoDeCrear,
  },
})
const conEtiqueta = (hoja: HojaLista, etiqueta: string, abierta = hoja.abierta): HojaLista => ({
  ...hoja,
  abierta,
  tarjetaTotal: { ...hoja.tarjetaTotal, etiqueta },
})
const pantalla = (hoja: HojaLista) => (
  <PantallaDeCotizar
    hoja={hoja}
    inicial={INICIAL}
    vehiculoId={null}
    vehiculoSoltado={false}
    leadId={LEAD}
  />
)
const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
const pedidos = () => ejecutar.mock.calls.map((c) => c[0] as PedidoDeGuardado)

beforeEach(() => {
  window.sessionStorage.clear()
  ejecutar.mockReset()
  refrescar.mockReset()
  avisar.mockReset()
})
afterEach(cleanup)

describe('PantallaDeCotizar › lo guardado', () => {
  it('con `repetido`, muestra el total de la respuesta y no el de la hoja, con su aviso (4-21)', async () => {
    ejecutar.mockResolvedValue(guardada(true, 1234))
    render(pantalla(hojaDePrueba()))
    await act(async () => {
      guardar()
      await Promise.resolve()
    })
    expect(screen.getByText('Cotización n.º 41 guardada')).toBeTruthy()
    const total = document.querySelector('[data-total-guardado]')?.textContent ?? ''
    expect(total.replace(/\D/g, '')).toContain('1234')
    expect(total.replace(/\D/g, '')).not.toContain('2350')
    expect(
      screen.getByText(/ya se había guardado antes de que se cortara la conexión/),
    ).toBeTruthy()
  })

  it('tras reenviar un pendiente, una guardada sin `repetido` también lo dice', async () => {
    const pendiente: PedidoDeGuardado = {
      intento: ID,
      origenId: hojaDePrueba().origen.id,
      leadId: LEAD,
      vehiculoId: null,
      abierta: 'vieja',
      entradas: { inputs: {}, banderas: {}, overrides: {} },
      conLaAbierta: false,
    }
    window.sessionStorage.setItem(
      claveDelPendiente(pendiente.origenId, LEAD, null),
      JSON.stringify(pendiente),
    )
    ejecutar.mockResolvedValue(guardada(false))
    render(pantalla(hojaDePrueba()))
    await act(async () => {
      guardar()
      await Promise.resolve()
    })
    expect(pedidos()[0]).toEqual(pendiente)
    expect(screen.getByText(/Se guardó el pedido que había quedado sin confirmar/)).toBeTruthy()
  })

  it('«Cotizar otra» suelta lo guardado, vuelve a la hoja y pide la página de nuevo', async () => {
    ejecutar.mockResolvedValue(guardada(false))
    render(pantalla(hojaDePrueba()))
    await act(async () => {
      guardar()
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cotizar otra' }))
    expect(refrescar).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-hoja]')).not.toBeNull()
  })
})

describe('PantallaDeCotizar › la hoja abierta y la instantánea', () => {
  it('el guardado manda la abierta con la que se montó la hoja, aunque llegue otra por props', async () => {
    ejecutar.mockResolvedValue(guardada(false))
    const hoja = hojaDePrueba()
    const vista = render(pantalla(hoja))
    vista.rerender(pantalla(conEtiqueta(hoja, hoja.tarjetaTotal.etiqueta, `${hoja.abierta}-otra`)))
    await act(async () => {
      guardar()
      await Promise.resolve()
    })
    expect(pedidos()[0]?.abierta).toBe(hoja.abierta)
  })

  it('mientras guarda, otra hoja por props no llega a la hoja ni la vuelve a montar', async () => {
    let soltar: (v: unknown) => void = () => {}
    ejecutar.mockReturnValue(new Promise((r) => (soltar = r)))
    const hoja = conEtiqueta(hojaDePrueba(), 'Total de antes')
    const vista = render(pantalla(hoja))
    act(() => {
      guardar()
    })
    vista.rerender(pantalla(conEtiqueta(hoja, 'Total de después', 'otra-abierta')))
    expect(screen.getByText('Total de antes')).toBeTruthy()
    expect(screen.queryByText('Total de después')).toBeNull()
    await act(async () => {
      soltar(guardada(false))
      await Promise.resolve()
    })
    expect(screen.getByText('Cotización n.º 41 guardada')).toBeTruthy()
    expect(avisar).not.toHaveBeenCalled()
  })
})
