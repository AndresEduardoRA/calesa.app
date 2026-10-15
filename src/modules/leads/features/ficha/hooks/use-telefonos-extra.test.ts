import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE, type LeadDeFicha } from '../../../entities/ficha'
import { useTelefonosExtra } from './use-telefonos-extra'

const guardarAccion = vi.fn<(entrada: Record<string, unknown>) => Promise<unknown>>()
const quitarAccion = vi.fn<(entrada: Record<string, unknown>) => Promise<unknown>>()
const refrescar = vi.fn()
const avisarConDeshacer = vi.fn<(mensaje: string, alDeshacer: () => void) => void>()
const avisarError = vi.fn()
const avisarExito = vi.fn()

vi.mock('next-safe-action/hooks', () => ({
  useAction: (accion: string) => ({
    executeAsync: accion === 'guardar' ? guardarAccion : quitarAccion,
    isPending: false,
  }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
vi.mock('../actions/guardar-telefono-extra', () => ({ guardarTelefonoExtra: 'guardar' }))
vi.mock('../actions/quitar-telefono-extra', () => ({ quitarTelefonoExtra: 'quitar' }))
vi.mock('@/shared/ui/toasts', () => ({
  avisarConDeshacer: (m: string, d: () => void) => {
    avisarConDeshacer(m, d)
  },
  avisarError: (e: unknown) => {
    avisarError(e)
  },
  avisarExito: (m: string) => {
    avisarExito(m)
  },
}))

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const CASA = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'
const TRABAJO = '2d3e4f50-6172-4839-9a0b-1c2d3e4f5061'

const ficha = (telefonos: LeadDeFicha['telefonos']): LeadDeFicha =>
  ({
    id: ID,
    telefonoCc: '+591',
    telefono: '59170011002',
    telefonos,
  }) as unknown as LeadDeFicha

const ESTADO = {
  resultado: 'agregado',
  actualizadoEn: '2026-10-14T12:00:00.000Z',
  telefonoCc: '+591',
  telefono: '59170011002',
  telefonos: [{ id: CASA, telefono: '59171234567', etiqueta: 'Casa' }],
  quitado: null,
}

const ok = (data: unknown) => ({ data: { ok: true, data } })

beforeEach(() => {
  guardarAccion.mockReset()
  quitarAccion.mockReset()
  refrescar.mockReset()
  avisarConDeshacer.mockReset()
  avisarError.mockReset()
  avisarExito.mockReset()
})

afterEach(cleanup)

describe('useTelefonosExtra: la lista', () => {
  it('arranca con los extras de la ficha y se vuelve a sembrar si la ficha cambia', () => {
    const { result, rerender } = renderHook((f: LeadDeFicha) => useTelefonosExtra(f), {
      initialProps: ficha([{ id: CASA, telefono: '59171234567', etiqueta: 'Casa' }]),
    })
    expect(result.current.extras).toHaveLength(1)
    rerender(
      ficha([
        { id: CASA, telefono: '59171234567', etiqueta: 'Casa' },
        { id: TRABAJO, telefono: '59172222222', etiqueta: 'Anterior' },
      ]),
    )
    expect(result.current.extras).toHaveLength(2)
  })

  it('guardar pone la lista que devolvió la base, con el código de país del lead', async () => {
    guardarAccion.mockResolvedValue(ok(ESTADO))
    const { result } = renderHook(() => useTelefonosExtra(ficha([])))
    await act(async () => {
      await result.current.guardar({ id: CASA, telefono: '71234567', etiqueta: 'Casa' })
    })
    expect(guardarAccion).toHaveBeenCalledWith({
      leadId: ID,
      id: CASA,
      codigoDePais: '+591',
      telefono: '71234567',
      etiqueta: 'Casa',
      creadoEn: null,
    })
    expect(result.current.extras).toEqual([{ id: CASA, telefono: '59171234567', etiqueta: 'Casa' }])
  })

  it('con 10 el tope está alcanzado', () => {
    const diez = Array.from({ length: 10 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      telefono: `5917100000${String(i)}`,
      etiqueta: null,
    }))
    const { result } = renderHook(() => useTelefonosExtra(ficha(diez)))
    expect(result.current.topeAlcanzado).toBe(true)
  })

  it('un lead que ya no se ve vuelve a leer el servidor', async () => {
    guardarAccion.mockResolvedValue({
      data: { ok: false, error: { codigo: 'sin_permiso', mensaje: MENSAJE_DE_LEAD_NO_DISPONIBLE } },
    })
    const { result } = renderHook(() => useTelefonosExtra(ficha([])))
    await act(async () => {
      await result.current.guardar({ id: CASA, telefono: '71234567', etiqueta: null })
    })
    expect(refrescar).toHaveBeenCalledOnce()
  })
})

describe('useTelefonosExtra: quitar y deshacer', () => {
  const quitado = {
    id: CASA,
    telefono: '59171234567',
    etiqueta: 'Casa',
    creadoEn: '2026-10-13T10:00:00.000Z',
  }
  const trasQuitar = {
    ...ESTADO,
    resultado: 'quitado',
    telefonos: [],
    quitado,
  }

  it('quita, ofrece «Deshacer» y «Deshacer» restituye el mismo id, etiqueta y lugar', async () => {
    quitarAccion.mockResolvedValue(ok(trasQuitar))
    guardarAccion.mockResolvedValue(ok(ESTADO))
    const { result } = renderHook(() =>
      useTelefonosExtra(ficha([{ id: CASA, telefono: '59171234567', etiqueta: 'Casa' }])),
    )
    await act(async () => {
      await result.current.quitar({ id: CASA, telefono: '59171234567', etiqueta: 'Casa' })
    })
    expect(quitarAccion).toHaveBeenCalledWith({ leadId: ID, id: CASA })
    expect(result.current.extras).toEqual([])
    expect(avisarConDeshacer).toHaveBeenCalledOnce()

    const deshacer = avisarConDeshacer.mock.calls[0]?.[1]
    await act(async () => {
      deshacer?.()
      await Promise.resolve()
    })
    expect(guardarAccion).toHaveBeenCalledWith({
      leadId: ID,
      id: CASA,
      // El número ya normalizado va con «+»: la base lo toma tal cual.
      codigoDePais: null,
      telefono: '+59171234567',
      etiqueta: 'Casa',
      creadoEn: '2026-10-13T10:00:00.000Z',
    })
    expect(result.current.extras).toHaveLength(1)
    expect(avisarExito).toHaveBeenCalledOnce()
  })

  it('si entretanto alguien agregó ese número, «Deshacer» lo dice y no duplica', async () => {
    quitarAccion.mockResolvedValue(ok(trasQuitar))
    guardarAccion.mockResolvedValue({
      data: {
        ok: false,
        error: { codigo: 'regla', mensaje: 'Ese número ya está en este lead.' },
        porCampo: { telefono: 'Ese número ya está en este lead.' },
      },
    })
    const { result } = renderHook(() =>
      useTelefonosExtra(ficha([{ id: CASA, telefono: '59171234567', etiqueta: 'Casa' }])),
    )
    await act(async () => {
      await result.current.quitar({ id: CASA, telefono: '59171234567', etiqueta: 'Casa' })
    })
    await act(async () => {
      avisarConDeshacer.mock.calls[0]?.[1]()
      await Promise.resolve()
    })
    expect(avisarError).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: 'Ese número ya está en este lead.' }),
    )
    expect(result.current.extras).toEqual([])
  })

  it('quitar uno que ya no estaba no ofrece deshacer nada', async () => {
    quitarAccion.mockResolvedValue(ok({ ...ESTADO, resultado: 'sin_cambios', telefonos: [] }))
    const { result } = renderHook(() => useTelefonosExtra(ficha([])))
    await act(async () => {
      await result.current.quitar({ id: CASA, telefono: '59171234567', etiqueta: null })
    })
    expect(avisarConDeshacer).not.toHaveBeenCalled()
    expect(avisarError).not.toHaveBeenCalled()
  })
})
