import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { Armar, Guardado, PedidoArmado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'

const recalcular = vi.hoisted(() => vi.fn())
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

// Lo que la hoja hace al guardar (paso 4.13-3b): confirma la celda abierta, espera al total al día (P8) y arma el pedido. El guardado es un doble que anota lo armado.
const LEAD = '1b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ usd: 2350, valores: { remate: 0 } }),
  estado: { tipo: 'al_dia' },
}

function guardadoDePrueba(mas: Partial<Guardado> = {}) {
  const armados: (PedidoArmado | null)[] = []
  const guardado: Guardado = {
    estado: { tipo: 'listo' },
    enLinea: true,
    hayPendiente: false,
    ocupado: false,
    guardar: vi.fn((armar: Armar) => {
      armar((p) => armados.push(p))
    }),
    olvidarAviso: () => {},
    reiniciar: () => {},
    ...mas,
  }
  return { guardado, armados }
}

const montar = (
  guardado: Guardado,
  { inicial = AL_DIA, leadId = LEAD }: { inicial?: RecalculoInicial; leadId?: string | null } = {},
) =>
  render(
    <HojaDeCotizar
      hoja={hojaDePrueba()}
      inicial={inicial}
      vehiculoId={null}
      vehiculoSoltado={false}
      leadId={leadId}
      guardado={guardado}
      alDescartar={() => {}}
    />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ProveedorAtajos>{children}</ProveedorAtajos>
      ),
    },
  )

function abrir(nodo: string, texto: string | null): HTMLInputElement {
  const celda = document.querySelector(`[data-nodo="${nodo}"] [data-parada="0"]`)
  if (!celda) {
    throw new Error(`No hay la celda ${nodo}`)
  }
  fireEvent.click(celda)
  const entrada = document.querySelector<HTMLInputElement>(`[data-nodo="${nodo}"] input`)
  if (!entrada) {
    throw new Error('No se abrió la edición')
  }
  if (texto !== null) {
    fireEvent.change(entrada, { target: { value: texto } })
  }
  return entrada
}

const ctrlS = (donde: Element) => fireEvent.keyDown(donde, { key: 's', ctrlKey: true })
const botonGuardar = () => screen.getByRole('button', { name: 'Guardar' })

beforeEach(() => {
  window.sessionStorage.clear()
  recalcular.mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HojaDeCotizar › guardar con una celda abierta', () => {
  it('con un número, Ctrl+S confirma la celda y guarda con lo que calculó ese recálculo', async () => {
    vi.useFakeTimers()
    recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 99 })))
    const { guardado, armados } = guardadoDePrueba()
    montar(guardado)
    const entrada = abrir('remate', '1500')
    ctrlS(entrada)
    expect(entrada.isConnected).toBe(false)
    expect(guardado.guardar).toHaveBeenCalledTimes(1)
    expect(armados).toEqual([])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(armados).toHaveLength(1)
    expect(armados[0]?.entradas.inputs).toEqual({ remate: 1500 })
    expect(armados[0]?.abierta).toBe(hojaDePrueba().abierta)
  })

  it('con «abc» ni guarda ni cierra: la entrada queda con su aviso', () => {
    const { guardado } = guardadoDePrueba()
    montar(guardado)
    const entrada = abrir('remate', 'abc')
    ctrlS(entrada)
    expect(entrada.isConnected).toBe(true)
    expect(entrada.getAttribute('aria-invalid')).toBe('true')
    expect(guardado.guardar).not.toHaveBeenCalled()
  })

  it('abierta y sin cambios, guarda: no se mira si hubo onCommit', () => {
    const { guardado, armados } = guardadoDePrueba()
    montar(guardado)
    const entrada = abrir('remate', null)
    ctrlS(entrada)
    expect(entrada.isConnected).toBe(false)
    expect(armados).toHaveLength(1)
  })

  it('un clic en «Guardar» con «abc» abierta no guarda, y el foco no sale de la celda', () => {
    const { guardado } = guardadoDePrueba()
    montar(guardado)
    const entrada = abrir('remate', 'abc')
    entrada.focus()
    // Lo que hace el navegador: el `mousedown` que nadie frena mueve el foco al botón (y la celda descarta lo que no es un número).
    if (fireEvent.mouseDown(botonGuardar())) {
      act(() => {
        entrada.blur()
      })
    }
    fireEvent.click(botonGuardar())
    expect(guardado.guardar).not.toHaveBeenCalled()
    expect(entrada.isConnected).toBe(true)
    expect(document.activeElement).toBe(entrada)
  })
})

describe('HojaDeCotizar › cuándo «Guardar» no guarda', () => {
  it('con el recálculo en fallo no guarda', () => {
    const { guardado } = guardadoDePrueba()
    montar(guardado, {
      inicial: { respuesta: AL_DIA.respuesta, estado: { tipo: 'fallo', recargar: false } },
    })
    expect(botonGuardar()).toHaveProperty('disabled', true)
    ctrlS(document.body)
    expect(guardado.guardar).not.toHaveBeenCalled()
  })

  it('sin lead, apagado con su motivo (P5)', () => {
    const { guardado } = guardadoDePrueba()
    montar(guardado, { leadId: null })
    expect(botonGuardar()).toHaveProperty('disabled', true)
    expect(screen.getByText('Para guardar, abre la hoja desde un lead.')).toBeTruthy()
  })

  it('con el total nulo, apagado (P9)', () => {
    const { guardado } = guardadoDePrueba()
    montar(guardado, {
      inicial: {
        respuesta: respuestaDePrueba({
          usd: null,
          faltantes: [{ codigo: 'requerido_sin_valor', donde: 'remate' }],
        }),
        estado: { tipo: 'al_dia' },
      },
    })
    expect(botonGuardar()).toHaveProperty('disabled', true)
  })

  it('con un pendiente vivo, «Guardar» sigue disponible aunque la hoja tenga un motivo: lo reenvía (4-21)', () => {
    const { guardado } = guardadoDePrueba({ hayPendiente: true })
    montar(guardado, {
      inicial: { respuesta: AL_DIA.respuesta, estado: { tipo: 'fallo', recargar: false } },
    })
    expect(botonGuardar()).toHaveProperty('disabled', false)
    fireEvent.click(botonGuardar())
    expect(guardado.guardar).toHaveBeenCalledTimes(1)
  })

  it('si el recálculo de lo confirmado falla, no arma', async () => {
    vi.useFakeTimers()
    recalcular.mockResolvedValue(fallo('inesperado', 'x'))
    const { guardado, armados } = guardadoDePrueba()
    montar(guardado)
    ctrlS(abrir('remate', '10'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(armados).toEqual([null])
  })
})
