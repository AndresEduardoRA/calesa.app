import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
import { PantallaDeUnaGuardada } from './pantalla-de-una-guardada'

const { recalcular, ejecutar } = vi.hoisted(() => ({ recalcular: vi.fn(), ejecutar: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }))
vi.mock('next-safe-action/hooks', () => ({ useAction: () => ({ executeAsync: ejecutar }) }))
vi.mock('../actions/guardar-cotizacion', () => ({ guardarCotizacion: {} }))
vi.mock('../../encima/actions/cotizar-encima', () => ({ cotizarEncima: {} }))

// «Cotizar encima» en la hoja de una guardada (4.15-3b, C8 y C9, P1 a): el aviso de otra versión lleva el botón, y con cambios sin guardar queda apagado.
const PERSONA = '3b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const OTRA_FORMULA = '00000000-0000-4000-8000-0000000000ff'
const AVISO_DE_CAMBIOS =
  'Guarda o descarta tus cambios antes de cotizar encima: la versión nueva lleva lo guardado.'
const VALORES = { remate: 1000, variante: 'gasolina', cuenta: 0, total: 2350 }
const INICIAL: RecalculoInicial = {
  respuesta: respuestaDePrueba({ usd: 2350, valores: VALORES }),
  estado: { tipo: 'al_dia' },
}
const OTRA_VERSION = {
  publicada: { id: OTRA_FORMULA, version: 5 },
  puede_cotizar_encima: true,
}

function montar(cruda: Record<string, unknown> = OTRA_VERSION) {
  const hoja = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada(cruda))
  if (!hoja) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return render(<PantallaDeUnaGuardada hoja={hoja} inicial={INICIAL} personaId={PERSONA} />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter>
        <ProveedorAtajos>{children}</ProveedorAtajos>
      </NuqsTestingAdapter>
    ),
  })
}
const aviso = () => document.querySelector('[data-aviso-de-version]')
const boton = () => screen.getByRole('button', { name: 'Cotizar encima' })

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
  recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 7, valores: { ...VALORES, total: 7 } })))
})
afterEach(cleanup)

describe('PantallaDeUnaGuardada: «Cotizar encima» (C8, C9)', () => {
  it('con otra versión publicada dibuja el aviso y el botón, encendido sin cambios', () => {
    montar()
    expect(aviso()?.textContent).toContain('Esta cotización usa la versión 3')
    expect(boton().getAttribute('aria-disabled')).toBeNull()
    expect(screen.queryByText(AVISO_DE_CAMBIOS)).toBeNull()
  })

  it('con lo tipeado y sin guardar el botón queda apagado y dice por qué', async () => {
    montar()
    tipear('remate', '1200')
    expect(await screen.findByText(AVISO_DE_CAMBIOS)).toBeTruthy()
    expect(boton().getAttribute('aria-disabled')).toBe('true')
  })

  it('con un pendiente en la pestaña y sin tipear nada también queda apagado', () => {
    window.sessionStorage.setItem(
      `cotizar-guardada-pendiente:${PERSONA}:${ID_DE_LA_COTIZACION}`,
      serializarPendienteDeEdicion({
        intento: 'i1',
        cotizacionId: ID_DE_LA_COTIZACION,
        actualizadoEn: ACTUALIZADO_EN,
        entradas: { inputs: { remate: 900 }, banderas: {}, overrides: {} },
        modoTc: null,
        verTotalBs: false,
        titulo: null,
        notas: null,
        vehiculoId: null,
      }),
    )
    montar()
    expect(boton().getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText(AVISO_DE_CAMBIOS)).toBeTruthy()
  })

  it('quien sólo ve (sin edición) no tiene cambios que guardar: el botón está encendido', () => {
    montar({ ...OTRA_VERSION, puede_guardar: false })
    expect(boton().getAttribute('aria-disabled')).toBeNull()
  })

  it('en la misma versión y vigente no hay aviso ni botón', () => {
    montar({ puede_cotizar_encima: true })
    expect(screen.queryByRole('button', { name: 'Cotizar encima' })).toBeNull()
    expect(aviso()).toBeNull()
  })
})
