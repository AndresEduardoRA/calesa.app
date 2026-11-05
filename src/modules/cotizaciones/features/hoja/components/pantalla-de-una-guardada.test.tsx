import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../../entities/apertura'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { hojaDeUnaGuardadaDesde } from '../../../entities/hoja-de-una-guardada-lectura'
import { crudaDeUnaGuardada } from '../../../entities/hoja-de-una-guardada.soporte'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import { PantallaDeUnaGuardada } from './pantalla-de-una-guardada'
import { render } from './render-con-url.soporte'

const { recalcular } = vi.hoisted(() => ({ recalcular: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: vi.fn() }) }))
vi.mock('../actions/guardar-cotizacion', () => ({ guardarCotizacion: {} }))
vi.mock('../../encima/actions/cotizar-encima', () => ({ cotizarEncima: {} }))

const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

// La hoja de una cotización guardada (4.15-3, C5, C6 y C11): sólo lectura para quien no la guarda, el total guardado cuando lo de hoy no es lo guardado.
const VALORES = { remate: 1000, variante: 'gasolina', cuenta: 0, total: 2350 }
const DOS = [
  { clave: 'paralelo', nombre: 'Paralelo' },
  { clave: 'unificado', nombre: 'Unificado' },
]
const alDia = (usd: number | null, valores: Record<string, number | string | null> = VALORES) =>
  ({
    respuesta: respuestaDePrueba({ usd, valores }),
    estado: { tipo: 'al_dia' },
  }) satisfies RecalculoInicial
const FALLO: RecalculoInicial = { respuesta: null, estado: { tipo: 'fallo', recargar: true } }

function montar(cruda: Record<string, unknown> = {}, inicial: RecalculoInicial = alDia(2350)) {
  const hoja = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada(cruda))
  if (!hoja) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return render(<PantallaDeUnaGuardada hoja={hoja} inicial={inicial} personaId={PERSONA} />)
}
const SOLO_LECTURA = 'Sólo lectura: no puedes guardar esta cotización.'
const totalGuardado = () => document.querySelector('[data-total-cotizado]')
const aviso = () => document.querySelector('[data-aviso-de-hoy]')

beforeEach(() => {
  window.sessionStorage.clear()
  recalcular.mockReset()
  recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 7 })))
})
afterEach(cleanup)

describe('PantallaDeUnaGuardada: sólo lectura (C6)', () => {
  it('quien no la guarda no ve «Guardar», lee el texto y los modos y «Ver total Bs» están apagados', () => {
    montar({
      puede_guardar: false,
      cabecera: { modos: DOS, ver_total_bs: true, moneda_bs: 'BOB' },
    })
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
    expect(screen.getByText(SOLO_LECTURA)).toBeTruthy()
    for (const modo of DOS) {
      expect(screen.getByRole<HTMLInputElement>('radio', { name: modo.nombre }).disabled).toBe(true)
    }
    const interruptor = screen.getByRole('switch', { name: 'Ver total en moneda local' })
    expect(interruptor.getAttribute('aria-disabled')).toBe('true')
  })

  it('Ctrl+S no hace nada y nada se guarda en la pestaña', () => {
    montar({ puede_guardar: false })
    fireEvent.keyDown(document.body, { key: 's', ctrlKey: true })
    expect(recalcular).not.toHaveBeenCalled()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('quien la guarda no lee el texto de sólo lectura y los modos se eligen', () => {
    montar({ puede_guardar: true, cabecera: { modos: DOS, ver_total_bs: false, moneda_bs: null } })
    expect(screen.queryByText(SOLO_LECTURA)).toBeNull()
    for (const modo of DOS) {
      expect(screen.getByRole<HTMLInputElement>('radio', { name: modo.nombre }).disabled).toBe(
        false,
      )
    }
  })
})

describe('PantallaDeUnaGuardada: la hoja calcula por su cotización (C1, C2)', () => {
  it('abre con lo guardado dibujado y su total, sin pedir nada al navegador', () => {
    montar()
    expect(document.querySelector('[data-total]')?.textContent).toMatch(/2[.,\s]?350/)
    expect(recalcular).not.toHaveBeenCalled()
  })

  it('tipear una celda pide el recálculo con la cotización y sin hoja abierta', async () => {
    montar()
    const celda = document.querySelector('[data-nodo="remate"] [data-parada="0"]')
    if (!celda) {
      throw new Error('No hay la celda remate')
    }
    fireEvent.click(celda)
    const entrada = document.querySelector<HTMLInputElement>('[data-nodo="remate"] input')
    if (!entrada) {
      throw new Error('No se abrió la edición')
    }
    fireEvent.change(entrada, { target: { value: '1200' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    await waitFor(() => {
      expect(recalcular).toHaveBeenCalled()
    })
    const pedido = recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo
    expect(pedido.de).toEqual({
      tipo: 'guardada',
      cotizacionId: crudaDeUnaGuardada().cotizacion.id,
    })
    expect(pedido.entradas.inputs).toEqual({ remate: 1200 })
  })

  it('no deja borrador: abrir y tipear no escribe en la pestaña (el borrador es del guardado)', () => {
    montar()
    expect(window.sessionStorage.length).toBe(0)
  })
})

describe('PantallaDeUnaGuardada: el total guardado cuando lo de hoy no es lo guardado (C11)', () => {
  it('lo de hoy igual a lo guardado: ni aviso ni «Total guardado»', () => {
    montar({}, alDia(2350))
    expect(aviso()).toBeNull()
    expect(totalGuardado()).toBeNull()
  })

  it('el total de hoy es otro: el aviso y «Total guardado» con el total de antes', () => {
    montar({}, alDia(2400))
    expect(aviso()?.textContent).toBe(
      'Lo de hoy no es lo guardado: cambió una tabla o un dato del vehículo desde que se guardó.',
    )
    expect(totalGuardado()?.textContent).toMatch(/2[.,\s]?350/)
    expect(document.querySelector('[data-total]')?.textContent).toMatch(/2[.,\s]?400/)
  })

  it('una celda distinta con el mismo total: el aviso, sin «Total guardado»', () => {
    montar({}, alDia(2350, { ...VALORES, remate: 999 }))
    expect(aviso()).not.toBeNull()
    expect(totalGuardado()).toBeNull()
  })

  it('el recálculo falló: «No se pudo recalcular» y «Total guardado», sin el aviso', () => {
    montar({}, FALLO)
    expect(screen.getByText('No se pudo recalcular.')).toBeTruthy()
    expect(aviso()).toBeNull()
    expect(totalGuardado()?.textContent).toMatch(/2[.,\s]?350/)
  })

  it('quien sólo ve lee las dos cifras', () => {
    montar({ puede_guardar: false }, alDia(2400))
    expect(totalGuardado()).not.toBeNull()
    expect(document.querySelector('[data-total]')).not.toBeNull()
    expect(screen.getByText(SOLO_LECTURA)).toBeTruthy()
  })

  it('tipear después no cambia lo decidido al abrir', async () => {
    montar({}, alDia(2350))
    const celda = document.querySelector('[data-nodo="remate"] [data-parada="0"]')
    if (!celda) {
      throw new Error('No hay la celda remate')
    }
    fireEvent.click(celda)
    const entrada = document.querySelector<HTMLInputElement>('[data-nodo="remate"] input')
    if (!entrada) {
      throw new Error('No se abrió la edición')
    }
    fireEvent.change(entrada, { target: { value: '5' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    await waitFor(() => {
      expect(recalcular).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(document.querySelector('[data-total]')?.textContent).toMatch(/7/)
    })
    expect(aviso()).toBeNull()
    expect(totalGuardado()).toBeNull()
  })
})
