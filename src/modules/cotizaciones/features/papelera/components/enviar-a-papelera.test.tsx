import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'

const h = vi.hoisted(() => ({
  enviar: vi.fn(),
  restaurar: vi.fn(),
  push: vi.fn(),
  toasts: {
    avisar: vi.fn(),
    avisarConDeshacer: vi.fn(),
    avisarError: vi.fn(),
    avisarExito: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push }) }))
// Las actions se llaman directo (el envío se pide al primer clic, sin `useAction`).
vi.mock('../actions/enviar-a-papelera', () => ({ enviarCotizacionesAPapelera: h.enviar }))
vi.mock('../actions/restaurar-de-papelera', () => ({
  restaurarCotizacionesDePapelera: h.restaurar,
}))
vi.mock('@/shared/ui/toasts', () => h.toasts)

import { HUECOS_DE_PAPELERA_EN_LA_GUARDADA } from './huecos-en-la-guardada'

afterEach(cleanup)

const ID = '22222222-2222-4222-8222-222222222222'
const LOTE = '11111111-1111-4111-8111-111111111111'
const VERSION = '2026-11-07T11:00:00.123456+00:00'
const VERSION_DEL_LOTE = '2026-11-07T12:00:00.000001+00:00'

const cotizacion = (clase: 'preventa' | 'final'): CotizacionDeLaHoja => ({
  id: ID,
  numero: 4,
  clase,
  version: 1,
  origenId: '33333333-3333-4333-8333-333333333333',
  leadId: null,
  vehiculoId: null,
  modoTc: null,
  verTotalBs: false,
  titulo: 'Hilux',
  notas: null,
  creadoEn: '2026-11-01T10:00:00+00:00',
  actualizadoEn: VERSION,
})

const con = (...claves: string[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const })) as Permisos

function dibujar(clase: 'preventa' | 'final', puedeGuardar: boolean, permisos: Permisos) {
  const { Acciones } = HUECOS_DE_PAPELERA_EN_LA_GUARDADA
  if (!Acciones) {
    throw new Error('El área papelera no llena `Acciones`')
  }
  return render(
    <Acciones cotizacion={cotizacion(clase)} puedeGuardar={puedeGuardar} permisos={permisos} />,
  )
}

const boton = () => screen.queryByRole('button', { name: 'Enviar a la papelera' })

const enviada = {
  lote: LOTE,
  actualizadoEn: VERSION_DEL_LOTE,
  enviados: [{ id: ID, numero: 4, titulo: 'Hilux' }],
  rechazados: [],
}

beforeEach(() => {
  h.enviar.mockReset()
  h.restaurar.mockReset()
  h.push.mockReset()
  for (const f of Object.values(h.toasts)) f.mockReset()
})

describe('«Enviar a la papelera» en la cabecera de la guardada: quién lo ve', () => {
  it('llena `Acciones` y no `Debajo`', () => {
    expect(HUECOS_DE_PAPELERA_EN_LA_GUARDADA.Acciones).toBeTypeOf('function')
    expect(HUECOS_DE_PAPELERA_EN_LA_GUARDADA.Debajo).toBeUndefined()
  })

  it('lo ve quien puede guardarla, y en una preventa quien modera', () => {
    dibujar('final', true, con('cotizaciones.ver'))
    expect(boton()).toBeTruthy()
    cleanup()
    dibujar('preventa', false, con('cotizaciones.moderar'))
    expect(boton()).toBeTruthy()
  })

  it('no lo ve quien sólo la ve, ni en una final quien sólo modera', () => {
    const { container } = dibujar('preventa', false, con('cotizaciones.ver'))
    expect(boton()).toBeNull()
    expect(container.textContent).toBe('')
    cleanup()
    dibujar('final', false, con('cotizaciones.moderar'))
    expect(boton()).toBeNull()
  })
})

describe('enviar la guardada a la papelera', () => {
  it('envía la versión de la página tal cual, lleva al listado y ofrece «Deshacer»', async () => {
    h.enviar.mockResolvedValue({ data: { ok: true, data: enviada } })
    dibujar('preventa', true, con('cotizaciones.editar'))
    fireEvent.click(boton() as HTMLElement)
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/cotizaciones'))
    expect(h.enviar).toHaveBeenCalledWith({ cotizaciones: [{ id: ID, actualizadoEn: VERSION }] })
    expect(h.toasts.avisarConDeshacer).toHaveBeenCalledWith(
      '«Hilux» se envió a la papelera.',
      expect.any(Function),
    )
  })

  it('si otra persona la cambió, avisa el conflicto y se queda en la página', async () => {
    h.enviar.mockResolvedValue({
      data: {
        ok: true,
        data: {
          lote: null,
          actualizadoEn: null,
          enviados: [],
          rechazados: [{ id: ID, titulo: 'Hilux', codigo: 'PT409', motivo: 'Ana la cambió.' }],
        },
      },
    })
    dibujar('preventa', true, con('cotizaciones.editar'))
    fireEvent.click(boton() as HTMLElement)
    await waitFor(() =>
      expect(h.toasts.avisarError).toHaveBeenCalledWith({
        codigo: 'conflicto',
        mensaje: 'Ana la cambió.',
      }),
    )
    expect(h.push).not.toHaveBeenCalled()
    expect(h.toasts.avisarConDeshacer).not.toHaveBeenCalled()
  })

  it('sin red avisa y se queda', async () => {
    h.enviar.mockRejectedValue(new Error('sin red'))
    dibujar('preventa', true, con('cotizaciones.editar'))
    fireEvent.click(boton() as HTMLElement)
    await waitFor(() => expect(h.toasts.avisarError).toHaveBeenCalled())
    expect(h.push).not.toHaveBeenCalled()
  })

  it('está apagado mientras envía y vuelve si no entró', async () => {
    let responder: (valor: unknown) => void = () => undefined
    h.enviar.mockReturnValue(new Promise((r) => (responder = r)))
    dibujar('preventa', true, con('cotizaciones.editar'))
    fireEvent.click(boton() as HTMLElement)
    await waitFor(() => expect((boton() as HTMLButtonElement).disabled).toBe(true))
    responder({ data: { ok: false, error: { codigo: 'regla', mensaje: 'No.' } } })
    await waitFor(() => expect((boton() as HTMLButtonElement).disabled).toBe(false))
    expect(h.toasts.avisarError).toHaveBeenCalledWith({ codigo: 'regla', mensaje: 'No.' })
  })
})

describe('«Deshacer» en el aviso', () => {
  it('«Deshacer» restaura ese lote con la versión que devolvió el envío', async () => {
    h.enviar.mockResolvedValue({ data: { ok: true, data: enviada } })
    h.restaurar.mockResolvedValue({
      data: {
        ok: true,
        data: {
          actualizadoEn: VERSION_DEL_LOTE,
          restaurados: [{ id: ID, numero: 4, titulo: 'Hilux' }],
          pendientes: [],
          quedan: 0,
        },
      },
    })
    dibujar('preventa', true, con('cotizaciones.editar'))
    fireEvent.click(boton() as HTMLElement)
    await waitFor(() => expect(h.toasts.avisarConDeshacer).toHaveBeenCalled())
    const deshacer = h.toasts.avisarConDeshacer.mock.calls[0]?.[1] as () => void
    deshacer()
    await waitFor(() =>
      expect(h.toasts.avisarExito).toHaveBeenCalledWith('«Hilux» volvió a tus cotizaciones.'),
    )
    expect(h.restaurar).toHaveBeenCalledWith({
      loteId: LOTE,
      actualizadoEnEsperado: VERSION_DEL_LOTE,
    })
  })

  it('«Deshacer» que no pudo restaurarla lo dice como error, con el motivo', async () => {
    h.enviar.mockResolvedValue({ data: { ok: true, data: enviada } })
    h.restaurar.mockResolvedValue({
      data: {
        ok: true,
        data: {
          actualizadoEn: VERSION_DEL_LOTE,
          restaurados: [],
          pendientes: [{ id: ID, numero: 4, titulo: 'Hilux', motivo: 'Ya tiene otra versión.' }],
          quedan: 1,
        },
      },
    })
    dibujar('preventa', true, con('cotizaciones.editar'))
    fireEvent.click(boton() as HTMLElement)
    await waitFor(() => expect(h.toasts.avisarConDeshacer).toHaveBeenCalled())
    ;(h.toasts.avisarConDeshacer.mock.calls[0]?.[1] as () => void)()
    await waitFor(() =>
      expect(h.toasts.avisarError).toHaveBeenCalledWith({
        codigo: 'regla',
        mensaje: 'No se restauró «Hilux»: Ya tiene otra versión.',
      }),
    )
  })
})
