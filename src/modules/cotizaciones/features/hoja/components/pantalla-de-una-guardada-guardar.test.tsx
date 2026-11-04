import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { RecalculoInicial } from '../../../entities/apertura'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { hojaDeUnaGuardadaDesde } from '../../../entities/hoja-de-una-guardada-lectura'
import {
  ACTUALIZADO_EN,
  crudaDeUnaGuardada,
  ID_DE_LA_COTIZACION,
} from '../../../entities/hoja-de-una-guardada.soporte'
import { serializarPendienteDeEdicion } from '../../../entities/intento-de-guardado'
import type { PedidoDeEdicion } from '../../../entities/pedido-de-edicion'
import { PantallaDeUnaGuardada } from './pantalla-de-una-guardada'

const { recalcular, ejecutar } = vi.hoisted(() => ({ recalcular: vi.fn(), ejecutar: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/guardar-cotizacion', () => ({ guardarCotizacion: {} }))

// «Guardar» en la hoja de una cotización guardada (4.15-3, C8, C9 y C11): apagado sin cambios, salvo con un pendiente o cuando lo de hoy no es lo guardado.
const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const SIN_CAMBIOS = 'Sin cambios que guardar.'
const VALORES = { remate: 1000, variante: 'gasolina', cuenta: 0, total: 2350 }
const alDia = (usd: number): RecalculoInicial => ({
  respuesta: respuestaDePrueba({ usd, valores: VALORES }),
  estado: { tipo: 'al_dia' },
})
const GUARDADA = {
  data: {
    ok: true,
    data: {
      tipo: 'guardada',
      cotizacion: { id: ID_DE_LA_COTIZACION, numero: 41, totalUsd: 7, repetido: false },
    },
  },
}

function montar(cruda: Record<string, unknown> = {}, inicial: RecalculoInicial = alDia(2350)) {
  const hoja = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada(cruda))
  if (!hoja) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return render(<PantallaDeUnaGuardada hoja={hoja} inicial={inicial} personaId={PERSONA} />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter>
        <ProveedorAtajos>{children}</ProveedorAtajos>
      </NuqsTestingAdapter>
    ),
  })
}
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

const pendiente = (intento: string): PedidoDeEdicion => ({
  intento,
  cotizacionId: ID_DE_LA_COTIZACION,
  actualizadoEn: ACTUALIZADO_EN,
  entradas: { inputs: { remate: 900 }, banderas: {}, overrides: {} },
  modoTc: null,
  verTotalBs: false,
  titulo: null,
  notas: null,
  vehiculoId: null,
})
const CLAVE_DEL_PENDIENTE = `cotizar-guardada-pendiente:${PERSONA}:${ID_DE_LA_COTIZACION}`

beforeEach(() => {
  window.sessionStorage.clear()
  recalcular.mockReset()
  ejecutar.mockReset()
  recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 7, valores: { ...VALORES, total: 7 } })))
})
afterEach(cleanup)

describe('«Guardar» sin cambios', () => {
  it('está apagado y lo dice; Ctrl+S no manda nada', () => {
    montar()
    expect(guardar().disabled).toBe(true)
    expect(screen.getByText(SIN_CAMBIOS)).toBeTruthy()
    fireEvent.keyDown(document.body, { key: 's', ctrlKey: true })
    expect(ejecutar).not.toHaveBeenCalled()
  })

  it('tras un cambio se enciende y deja de decirlo', async () => {
    montar()
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    expect(screen.queryByText(SIN_CAMBIOS)).toBeNull()
  })

  it('con un pendiente en la pestaña está encendido sin cambios y lo reenvía tal cual (V30)', async () => {
    window.sessionStorage.setItem(
      CLAVE_DEL_PENDIENTE,
      serializarPendienteDeEdicion(pendiente('i1')),
    )
    ejecutar.mockResolvedValue(GUARDADA)
    montar()
    expect(guardar().disabled).toBe(false)
    fireEvent.click(guardar())
    await waitFor(() => {
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })
    expect(ejecutar.mock.calls[0]?.[0]).toEqual(pendiente('i1'))
  })

  it('cuando lo de hoy no es lo guardado (C11) está encendido sin cambios y dice qué pasa al guardar', () => {
    montar({}, alDia(2400))
    expect(guardar().disabled).toBe(false)
    expect(screen.getByText('Guardar lo deja con lo de hoy.')).toBeTruthy()
  })

  it('quien sólo ve no lee «Guardar lo deja con lo de hoy.»', () => {
    montar({ puede_guardar: false }, alDia(2400))
    expect(screen.queryByText('Guardar lo deja con lo de hoy.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })
})

describe('guardar', () => {
  it('manda la cotización, SU versión como texto, lo que calculó el recálculo y título, notas y vehículo sin tocar', async () => {
    ejecutar.mockResolvedValue(GUARDADA)
    montar({
      cotizacion: {
        ...crudaDeUnaGuardada().cotizacion,
        titulo: 'Una camioneta',
        notas: 'Con flete',
      },
    })
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    await waitFor(() => {
      expect(ejecutar).toHaveBeenCalledTimes(1)
    })
    const pedido = ejecutar.mock.calls[0]?.[0] as PedidoDeEdicion
    expect(pedido).toMatchObject({
      cotizacionId: ID_DE_LA_COTIZACION,
      actualizadoEn: ACTUALIZADO_EN,
      entradas: { inputs: { remate: 1200 } },
      titulo: 'Una camioneta',
      notas: 'Con flete',
      vehiculoId: null,
      verTotalBs: false,
    })
    expect(pedido.intento).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('dice «Cambios guardados.» y suelta el pendiente; un cambio nuevo lo quita', async () => {
    ejecutar.mockResolvedValue(GUARDADA)
    montar()
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    await screen.findByText('Cambios guardados.')
    expect(window.sessionStorage.getItem(CLAVE_DEL_PENDIENTE)).toBeNull()
    tipear('remate', '1300')
    await waitFor(() => {
      expect(screen.queryByText('Cambios guardados.')).toBeNull()
    })
  })
})

describe('guardar: lo que dice la base', () => {
  it('el conflicto de versión dice lo de la base, que lo tipeado no vuelve y ofrece «Recargar»', async () => {
    ejecutar.mockResolvedValue({
      data: {
        ok: true,
        data: {
          tipo: 'rechazo',
          motivo: 'version_cambiada',
          mensaje: 'Olga Otra cambió esta cotización hace 2 minutos.',
        },
      },
    })
    montar()
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    await screen.findByText(/Olga Otra cambió esta cotización hace 2 minutos\./)
    expect(screen.getByText(/lo que escribiste no vuelve/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy()
    expect(window.sessionStorage.getItem(CLAVE_DEL_PENDIENTE)).toBeNull()
  })

  it('una respuesta perdida deja el pendiente y «Guardar» lo reenvía con el mismo intento (4-21)', async () => {
    ejecutar.mockResolvedValueOnce({ data: { ok: true, data: { tipo: 'perdida' } } })
    ejecutar.mockResolvedValueOnce(GUARDADA)
    montar()
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    await waitFor(() => {
      expect(window.sessionStorage.getItem(CLAVE_DEL_PENDIENTE)).not.toBeNull()
    })
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    await waitFor(() => {
      expect(ejecutar).toHaveBeenCalledTimes(2)
    })
    const [uno, dos] = ejecutar.mock.calls.map((c) => c[0] as PedidoDeEdicion)
    expect(dos?.intento).toBe(uno?.intento)
  })
})

describe('«Recargar» tras un conflicto', () => {
  it('con otra versión de la cotización el aviso del conflicto se va', async () => {
    ejecutar.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          tipo: 'rechazo',
          motivo: 'version_cambiada',
          mensaje: 'Olga Otra cambió esta cotización.',
        },
      },
    })
    const { rerender } = montar()
    tipear('remate', '1200')
    await waitFor(() => {
      expect(guardar().disabled).toBe(false)
    })
    fireEvent.click(guardar())
    await screen.findByText(/Olga Otra cambió esta cotización/)
    const otra = hojaDeUnaGuardadaDesde(
      crudaDeUnaGuardada({
        cotizacion: {
          ...crudaDeUnaGuardada().cotizacion,
          actualizado_en: '2026-11-04T09:00:00.000001+00:00',
        },
      }),
    )
    if (!otra) {
      throw new Error('La hoja de prueba no se leyó.')
    }
    rerender(<PantallaDeUnaGuardada hoja={otra} inicial={alDia(2350)} personaId={PERSONA} />)
    await waitFor(() => {
      expect(screen.queryByText(/Olga Otra cambió esta cotización/)).toBeNull()
    })
  })
})

describe('el borrador de una guardada (C9)', () => {
  it('lo tipeado queda en la pestaña con la clave de la cotización y su versión (la clave la completa `useBorradorDeEstado`)', async () => {
    montar()
    tipear('remate', '1200')
    await waitFor(() => {
      const claves = Array.from({ length: window.sessionStorage.length }, (_, i) =>
        window.sessionStorage.key(i),
      )
      expect(claves).toContain(
        `borrador-estado:cotizar-guardada:${PERSONA}:${ID_DE_LA_COTIZACION}:${ACTUALIZADO_EN}`,
      )
    })
  })

  it('quien sólo ve no deja borrador', () => {
    montar({ puede_guardar: false })
    expect(window.sessionStorage.length).toBe(0)
  })
})
