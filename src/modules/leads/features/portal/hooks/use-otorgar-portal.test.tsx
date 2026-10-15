import { act, cleanup, renderHook } from '@testing-library/react'
import { Activity, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOtorgarPortal } from './use-otorgar-portal'

// La action es de servidor: acá contesta lo que el test diga.
const otorgar = vi.fn<(entrada: unknown) => Promise<unknown>>()

vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: otorgar, isExecuting: false }),
}))
vi.mock('../actions/otorgar-portal', () => ({ otorgarPortal: 'otorgar' }))

const LEAD = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const VERSION = '2026-10-16T14:00:00.123+00:00'

const montar = (abierto = true) =>
  renderHook((a: boolean) => useOtorgarPortal({ leadId: LEAD, version: VERSION, abierto: a }), {
    initialProps: abierto,
  })

const ok = (data: unknown) => ({ data: { ok: true, data } })

afterEach(() => {
  cleanup()
  otorgar.mockReset()
})

describe('useOtorgarPortal: otorgar', () => {
  it('«Generar» manda la clave nula con la versión que se ve, y muestra la que vuelve', async () => {
    otorgar.mockResolvedValue(
      ok({ codigo: 'MII-4F2K9', otorgadoEn: '2026-10-16T14:05:00Z', clave: 'K7M2P9QX3A' }),
    )
    const hook = montar()
    await act(() => hook.result.current.generar())
    expect(otorgar).toHaveBeenCalledWith({ leadId: LEAD, clave: null, otorgadoEnEsperado: VERSION })
    expect(hook.result.current.otorgado).toEqual({
      codigo: 'MII-4F2K9',
      otorgadoEn: '2026-10-16T14:05:00Z',
      clave: 'K7M2P9QX3A',
      generada: true,
    })
  })

  it('con la escrita: la base no la devuelve y se muestra la escrita; el campo se vacía', async () => {
    otorgar.mockResolvedValue(
      ok({ codigo: 'MII-4F2K9', otorgadoEn: '2026-10-16T14:05:00Z', clave: null }),
    )
    const hook = montar()
    act(() => {
      hook.result.current.escribir('mi-clave-larga')
    })
    await act(() => hook.result.current.darConLaEscrita())
    expect(otorgar).toHaveBeenCalledWith({
      leadId: LEAD,
      clave: 'mi-clave-larga',
      otorgadoEnEsperado: VERSION,
    })
    expect(hook.result.current.otorgado).toMatchObject({ clave: 'mi-clave-larga', generada: false })
    expect(hook.result.current.clave).toBe('')
  })

  it('una clave que no cumple la regla no se manda: el motivo queda junto al campo', async () => {
    const hook = montar()
    act(() => {
      hook.result.current.escribir('corta')
    })
    await act(() => hook.result.current.darConLaEscrita())
    expect(otorgar).not.toHaveBeenCalled()
    expect(hook.result.current.motivo).toBe('La clave necesita al menos 8 caracteres.')
    act(() => {
      hook.result.current.escribir('corta-ya-no')
    })
    expect(hook.result.current.motivo).toBeNull()
  })

  it('un conflicto conserva lo escrito y se puede olvidar para volver a intentar', async () => {
    otorgar.mockResolvedValue({
      data: { ok: false, error: { codigo: 'conflicto', mensaje: 'Ya lo otorgó Rosa hace 1 min.' } },
    })
    const hook = montar()
    act(() => {
      hook.result.current.escribir('mi-clave-larga')
    })
    await act(() => hook.result.current.darConLaEscrita())
    expect(hook.result.current.error).toEqual({
      codigo: 'conflicto',
      mensaje: 'Ya lo otorgó Rosa hace 1 min.',
    })
    expect(hook.result.current.clave).toBe('mi-clave-larga')
    act(() => {
      hook.result.current.olvidarError()
    })
    expect(hook.result.current.error).toBeNull()
  })
})

describe('useOtorgarPortal: la clave se olvida', () => {
  it('al cerrar el diálogo se olvida la clave mostrada y la escrita', async () => {
    otorgar.mockResolvedValue(
      ok({ codigo: 'MII-4F2K9', otorgadoEn: '2026-10-16T14:05:00Z', clave: 'K7M2P9QX3A' }),
    )
    const hook = montar()
    await act(() => hook.result.current.generar())
    expect(hook.result.current.otorgado).not.toBeNull()
    hook.rerender(false)
    expect(hook.result.current.otorgado).toBeNull()
    expect(hook.result.current.clave).toBe('')
  })

  it('al esconderse la pantalla (Next la guarda en un <Activity> oculto) también se olvida', async () => {
    otorgar.mockResolvedValue(
      ok({ codigo: 'MII-4F2K9', otorgadoEn: '2026-10-16T14:05:00Z', clave: 'K7M2P9QX3A' }),
    )
    let modo: 'visible' | 'hidden' = 'visible'
    const Pantalla = ({ children }: { children: ReactNode }) => (
      <Activity mode={modo}>{children}</Activity>
    )
    const hook = renderHook(
      () => useOtorgarPortal({ leadId: LEAD, version: VERSION, abierto: true }),
      { wrapper: Pantalla },
    )
    act(() => {
      hook.result.current.escribir('escrita-a-medias')
    })
    await act(() => hook.result.current.generar())
    expect(hook.result.current.otorgado).not.toBeNull()
    modo = 'hidden'
    await act(async () => {
      hook.rerender()
      await Promise.resolve()
    })
    modo = 'visible'
    await act(async () => {
      hook.rerender()
      await Promise.resolve()
    })
    expect(hook.result.current.otorgado).toBeNull()
    expect(hook.result.current.clave).toBe('')
  })
})
