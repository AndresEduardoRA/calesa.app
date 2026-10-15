import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import { SIN_MARCAS, type MarcasDeLead } from '../../../entities/marcas'
import { useMarcas } from './use-marcas'

const favorito = vi.fn<(entrada: Record<string, unknown>) => Promise<unknown>>()
const tachado = vi.fn<(entrada: Record<string, unknown>) => Promise<unknown>>()
const etiquetas = vi.fn<(entrada: Record<string, unknown>) => Promise<unknown>>()
const refrescar = vi.fn()
const avisarConDeshacer = vi.fn<(mensaje: string, alDeshacer: () => void) => void>()
const avisarError = vi.fn()

vi.mock('next-safe-action/hooks', () => ({
  useAction: (accion: string) => ({
    executeAsync: { favorito, tachado, etiquetas }[accion],
    isPending: false,
  }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))
vi.mock('../actions/poner-favorito', () => ({ ponerFavorito: 'favorito' }))
vi.mock('../actions/poner-tachado', () => ({ ponerTachado: 'tachado' }))
vi.mock('../actions/poner-etiquetas', () => ({ ponerEtiquetas: 'etiquetas' }))
vi.mock('@/shared/ui/toasts', () => ({
  avisarConDeshacer: (m: string, d: () => void) => {
    avisarConDeshacer(m, d)
  },
  avisarError: (e: unknown) => {
    avisarError(e)
  },
}))

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const VIP = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'
const ok = (data: unknown) => ({ data: { ok: true, data } })
const rechazo = (mensaje: string) => ({
  data: { ok: false, error: { codigo: 'sin_permiso', mensaje } },
})

beforeEach(() => {
  for (const f of [favorito, tachado, etiquetas, refrescar, avisarConDeshacer, avisarError]) {
    f.mockReset()
  }
})

afterEach(cleanup)

describe('useMarcas', () => {
  it('pide el valor que se quiere (poner, no alternar) y relee la página', async () => {
    favorito.mockResolvedValue(ok({ resultado: 'puesto', valor: true }))
    const { result } = renderHook(() => useMarcas(ID, SIN_MARCAS))
    await act(() => result.current.favorito(true))
    expect(favorito).toHaveBeenCalledWith({ leadId: ID, valor: true })
    expect(result.current.marcas.esFavorito).toBe(true)
    expect(refrescar).toHaveBeenCalled()
  })

  it('si la base lo rechaza vuelve el valor de antes, lo dice y, si el lead ya no se ve, relee', async () => {
    tachado.mockResolvedValue(rechazo(MENSAJE_DE_LEAD_NO_DISPONIBLE))
    const { result } = renderHook(() => useMarcas(ID, SIN_MARCAS))
    await act(() => result.current.tachado(true))
    expect(result.current.marcas.estaTachado).toBe(false)
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'sin_permiso',
      mensaje: MENSAJE_DE_LEAD_NO_DISPONIBLE,
    })
    expect(refrescar).toHaveBeenCalled()
    expect(avisarConDeshacer).not.toHaveBeenCalled()
  })

  it('tachar ofrece «Deshacer», que pide destachar', async () => {
    tachado.mockResolvedValue(ok({ resultado: 'puesto', valor: true }))
    const { result } = renderHook(() => useMarcas(ID, SIN_MARCAS))
    await act(() => result.current.tachado(true))
    expect(avisarConDeshacer).toHaveBeenCalledTimes(1)
    tachado.mockResolvedValue(ok({ resultado: 'quitado', valor: false }))
    await act(async () => {
      avisarConDeshacer.mock.calls[0]?.[1]()
      await Promise.resolve()
    })
    expect(tachado).toHaveBeenLastCalledWith({ leadId: ID, valor: false })
  })

  it('una etiqueta queda como dice la base', async () => {
    etiquetas.mockResolvedValue(ok({ resultado: 'puesto', etiquetas: [VIP] }))
    const { result } = renderHook(() => useMarcas(ID, SIN_MARCAS))
    await act(() => result.current.etiqueta(VIP, true))
    expect(etiquetas).toHaveBeenCalledWith({ leadId: ID, etiquetas: [VIP], valor: true })
    expect(result.current.marcas.etiquetas).toEqual([VIP])
  })

  it('lo que trae el servidor manda sobre lo local', () => {
    const { result, rerender } = renderHook((m: MarcasDeLead) => useMarcas(ID, m), {
      initialProps: SIN_MARCAS,
    })
    rerender({ ...SIN_MARCAS, esFavorito: true })
    expect(result.current.marcas.esFavorito).toBe(true)
  })
})
