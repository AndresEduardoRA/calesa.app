import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import type { Armar, Guardado, PedidoArmado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'
import { render } from './render-con-url.soporte'

const { recalcular } = vi.hoisted(() => ({ recalcular: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

const DOS = [
  { clave: 'paralelo', nombre: 'Paralelo' },
  { clave: 'unificado', nombre: 'Unificado' },
]
const LEAD = '1b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ usd: 2350, valores: { remate: 0 } }),
  estado: { tipo: 'al_dia' },
}

function guardadoDePrueba() {
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
  return { guardado, armados }
}

const montar = (modos: { clave: string; nombre: string }[]) => {
  const g = guardadoDePrueba()
  render(
    <HojaDeCotizar
      hoja={hojaDePrueba({ modos })}
      inicial={AL_DIA}
      vehiculoId={null}
      vehiculoSoltado={false}
      leadId={LEAD}
      borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
      guardado={g.guardado}
    />,
  )
  return g
}
const radio = (nombre: string) => screen.getByRole<HTMLInputElement>('radio', { name: nombre })
const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

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

describe('HojaDeCotizar › los modos de tipo de cambio', () => {
  it('con dos modos, abre con «Paralelo» marcado y sin pedir nada', () => {
    montar(DOS)
    expect(radio('Paralelo').checked).toBe(true)
    expect(radio('Unificado').checked).toBe(false)
    expect(screen.getByRole('group', { name: 'Modo de tipo de cambio' })).toBeTruthy()
    expect(recalcular).not.toHaveBeenCalled()
  })

  it('elegir «Unificado» pide un recálculo con ese modo, a los 150 ms', async () => {
    montar(DOS)
    fireEvent.click(radio('Unificado'))
    expect(radio('Unificado').checked).toBe(true)
    await avanzar(160)
    expect(recalcular).toHaveBeenCalledTimes(1)
    expect((recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo).modoTc).toBe('unificado')
  })

  it('guardar sin tocar nada manda el primer modo; tras elegir, el elegido', async () => {
    const { armados } = montar(DOS)
    guardar()
    expect(armados[0]?.modoTc).toBe('paralelo')
    fireEvent.click(radio('Unificado'))
    await avanzar(160)
    guardar()
    await avanzar(10)
    expect(armados.at(-1)?.modoTc).toBe('unificado')
  })

  it('con un solo modo no hay radios y guarda ese modo; sin modos, nada y nulo', () => {
    const uno = montar([{ clave: 'm1', nombre: 'Único' }])
    expect(screen.queryByRole('group', { name: 'Modo de tipo de cambio' })).toBeNull()
    guardar()
    expect(uno.armados[0]?.modoTc).toBe('m1')
    cleanup()
    const ninguno = montar([])
    expect(document.querySelector('[data-cabecera]')).toBeNull()
    guardar()
    expect(ninguno.armados[0]?.modoTc).toBeNull()
  })
})
