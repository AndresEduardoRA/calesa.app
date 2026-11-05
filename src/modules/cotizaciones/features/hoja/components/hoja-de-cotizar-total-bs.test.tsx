import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { Armar, Guardado, PedidoArmado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'
import { render } from './render-con-url.soporte'

const { recalcular } = vi.hoisted(() => ({ recalcular: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

const LEAD = '1b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const base = respuestaDePrueba({ usd: 2350, valores: { remate: 0 } })
const AL_DIA: RecalculoInicial = {
  respuesta: { ...base, totales: { ...base.totales, bs: 16356 } },
  estado: { tipo: 'al_dia' },
}

function montar(cabecera: Parameters<typeof hojaDePrueba>[0], claveDeBorrador = 'cotizar:bs') {
  const armados: (PedidoArmado | null)[] = []
  const guardado: Guardado = {
    estado: { tipo: 'listo' },
    enLinea: true,
    hayPendiente: false,
    ocupado: false,
    guardarConLaAbierta: () => {},
    guardar: (armar: Armar) => {
      armar((p) => armados.push(p))
    },
    olvidarAviso: () => {},
    reiniciar: () => {},
  }
  render(
    <HojaDeCotizar
      hoja={hojaDePrueba(cabecera)}
      inicial={AL_DIA}
      vehiculoId={null}
      vehiculoSoltado={false}
      leadId={LEAD}
      borrador={{ clave: claveDeBorrador, alDescartar: () => {} }}
      guardado={guardado}
    />,
  )
  return armados
}
const OFRECE = { ver_total_bs: true, moneda_bs: 'BOB' }
const interruptor = () => screen.getByRole('switch', { name: 'Ver total en moneda local' })
const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
const linea = () => document.querySelector('[data-total-bs]')

beforeEach(() => {
  window.sessionStorage.clear()
  vi.useFakeTimers()
  recalcular.mockReset()
  recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 99 })))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HojaDeCotizar › «Ver total Bs»', () => {
  it('se ofrece: el interruptor nace apagado y sin línea; encendido, la línea con el total en BOB', () => {
    montar(OFRECE)
    expect(interruptor().getAttribute('aria-checked')).toBe('false')
    expect(linea()).toBeNull()
    fireEvent.click(interruptor())
    expect(interruptor().getAttribute('aria-checked')).toBe('true')
    expect(linea()?.textContent).toContain('Total en moneda local')
    expect(linea()?.querySelector('[data-monto-valor]')?.textContent).toMatch(/BOB|Bs/)
  })

  it('encenderlo no pide un recálculo', async () => {
    montar(OFRECE)
    fireEvent.click(interruptor())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(recalcular).not.toHaveBeenCalled()
  })

  it('guardar manda verTotalBs verdadero si quedó encendido y falso si no', () => {
    const armados = montar(OFRECE)
    guardar()
    expect(armados[0]?.verTotalBs).toBe(false)
    fireEvent.click(interruptor())
    guardar()
    expect(armados[1]?.verTotalBs).toBe(true)
  })

  it('con monedaBs nula (P6) o sin ofrecerlo, no hay interruptor y guarda falso', () => {
    const sinMoneda = montar({ ver_total_bs: true, moneda_bs: null })
    expect(screen.queryByRole('switch', { name: 'Ver total en moneda local' })).toBeNull()
    guardar()
    expect(sinMoneda[0]?.verTotalBs).toBe(false)
    cleanup()
    const noOfrecido = montar({ ver_total_bs: false, moneda_bs: 'BOB' })
    expect(screen.queryByRole('switch', { name: 'Ver total en moneda local' })).toBeNull()
    guardar()
    expect(noOfrecido[0]?.verTotalBs).toBe(false)
  })

  it('vuelve con el borrador si la hoja todavía lo ofrece, y no si ya no (C10)', async () => {
    montar(OFRECE)
    fireEvent.click(interruptor())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    cleanup()
    montar(OFRECE)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(interruptor().getAttribute('aria-checked')).toBe('true')
    cleanup()
    montar({ ver_total_bs: true, moneda_bs: null })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(screen.queryByRole('switch', { name: 'Ver total en moneda local' })).toBeNull()
  })
})
