import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../../entities/apertura'
import { claveDelBorrador } from '../../../entities/claves-de-la-hoja'
import { entradasIniciales, indiceDeHoja, type Entradas } from '../../../entities/entradas'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import type { RespuestaDeRecalculo } from '../../../entities/recalculo'
import { PantallaDeCotizar } from '../components/pantalla-de-cotizar'
import { useBorradorDeHoja } from './use-borrador-de-hoja'

const recalcular = vi.hoisted(() => vi.fn())
const avisar = vi.hoisted(() => vi.fn())
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: vi.fn() }) }))
vi.mock('../actions/crear-cotizacion', () => ({ crearCotizacion: {} }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('@/shared/ui/toasts', () => ({ avisar }))

// El borrador de la hoja (4-29) con el marco de verdad: se escribe al confirmar, vuelve al abrir con UN recálculo, y «Descartar» deja la hoja como recién abierta.
const LEAD = '1b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const HOJA = hojaDePrueba()
const CLAVE = `borrador-estado:${claveDelBorrador({ personaId: PERSONA, origenId: HOJA.origen.id, leadId: LEAD, vehiculoId: null })}`
const INICIAL: RecalculoInicial = {
  respuesta: respuestaDePrueba({ usd: 2350, valores: { remate: 0 } }),
  estado: { tipo: 'al_dia' },
}
const montar = () =>
  render(
    <NuqsTestingAdapter>
      <PantallaDeCotizar
        hoja={HOJA}
        inicial={INICIAL}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={LEAD}
        personaId={PERSONA}
      />
    </NuqsTestingAdapter>,
  )
const total = () => document.querySelector('[data-total]')?.textContent ?? ''
const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

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
  vi.useFakeTimers()
  window.sessionStorage.clear()
  recalcular.mockReset()
  avisar.mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useBorradorDeHoja', () => {
  it('tras una confirmación, la pestaña tiene el borrador con su clave, sólo con lo tipeado', async () => {
    recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 9 })))
    montar()
    tipear('remate', '1500')
    await avanzar(0)
    const guardado = JSON.parse(window.sessionStorage.getItem(CLAVE) ?? '{}') as Record<
      string,
      unknown
    >
    expect(guardado).toEqual({ inputs: [['remate', 1500]] })
  })

  it('al abrir con un borrador, lo repone con UN recálculo y avisa con «Descartar»', async () => {
    window.sessionStorage.setItem(CLAVE, JSON.stringify({ inputs: [['remate', 700]] }))
    recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 705 })))
    montar()
    await avanzar(500)
    expect(recalcular).toHaveBeenCalledTimes(1)
    expect((recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo).entradas.inputs).toEqual({
      remate: 700,
    })
    expect(avisar).toHaveBeenCalledWith(
      'Recuperamos lo que habías escrito y no guardaste.',
      expect.objectContaining({ etiqueta: 'Descartar' }),
    )
  })

  it('«Descartar» con ese recálculo en vuelo deja la respuesta inicial y las entradas vacías, sin pedir nada más', async () => {
    window.sessionStorage.setItem(CLAVE, JSON.stringify({ inputs: [['remate', 700]] }))
    let soltar: (r: Resultado<RespuestaDeRecalculo>) => void = () => {}
    recalcular.mockReturnValueOnce(new Promise((r) => (soltar = r)))
    montar()
    await avanzar(200)
    expect(recalcular).toHaveBeenCalledTimes(1)
    const { alHacer } = avisar.mock.calls[0]?.[1] as { alHacer: () => void }
    act(() => {
      alHacer()
    })
    await act(async () => {
      soltar(ok(respuestaDePrueba({ usd: 705 })))
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(total().replace(/\D/g, '')).toContain('2350')
    expect(recalcular).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(CLAVE)).toBeNull()
    expect(document.querySelector('[data-nodo="remate"]')?.textContent).not.toContain('700')
  })
})

// C2: la hoja abre con las entradas que recibe (la nueva, las vacías con el primer modo; una guardada, lo que ya tiene), y el borrador mide lo tipeado contra ESAS.
describe('useBorradorDeHoja: contra las iniciales que recibe', () => {
  const CLAVE_DIRECTA = 'borrador-estado:cotizar:iniciales'
  const INDICE = indiceDeHoja(HOJA.secciones, HOJA.cabecera.modos)
  const INICIALES: Entradas = {
    ...entradasIniciales(INDICE),
    inputs: new Map([['remate', 800]]),
  }
  const montarDirecto = (alDescartar = vi.fn(), reponer = vi.fn()) => {
    renderHook(() =>
      useBorradorDeHoja({
        clave: 'cotizar:iniciales',
        entradas: INICIALES,
        verTotalBs: true,
        iniciales: INICIALES,
        verTotalBsInicial: true,
        ofrece: true,
        indice: INDICE,
        reponer,
        alDescartar,
      }),
    )
    return { alDescartar, reponer }
  }
  const guardado = () => JSON.parse(window.sessionStorage.getItem(CLAVE_DIRECTA) ?? '{}') as unknown

  it('abrir sin tocar nada con unas iniciales que no son las vacías no deja borrador', () => {
    const { reponer } = montarDirecto()
    expect(guardado()).toEqual({})
    expect(reponer).not.toHaveBeenCalled()
  })

  it('un borrador igual a las iniciales no vuelve ni avisa (no hay nada que recuperar)', () => {
    window.sessionStorage.setItem(
      CLAVE_DIRECTA,
      JSON.stringify({ inputs: [['remate', 800]], verTotalBs: true }),
    )
    const { reponer } = montarDirecto()
    expect(reponer).not.toHaveBeenCalled()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('un borrador distinto vuelve, y «Descartar» le pide al marco volver a montar la hoja con las iniciales', () => {
    window.sessionStorage.setItem(CLAVE_DIRECTA, JSON.stringify({ inputs: [['remate', 700]] }))
    const { reponer, alDescartar } = montarDirecto()
    expect(reponer).toHaveBeenCalledTimes(1)
    expect([...(reponer.mock.calls[0]?.[0] as Entradas).inputs]).toEqual([['remate', 700]])
    const { alHacer } = avisar.mock.calls[0]?.[1] as { alHacer: () => void }
    act(() => {
      alHacer()
    })
    expect(alDescartar).toHaveBeenCalledTimes(1)
    expect(guardado()).toEqual({})
  })
})
