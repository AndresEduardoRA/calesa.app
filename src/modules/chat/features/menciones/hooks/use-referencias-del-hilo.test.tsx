import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mensaje } from '../../../entities/mensajes'
import type { EstadoDeReferencia } from '../../../entities/referencias'
import { useReferenciasDelHilo } from './use-referencias-del-hilo'

vi.mock('../../../composicion.client', () => ({ leerReferencias: vi.fn() }))

const L1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const L2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const V1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'

function mensaje(n: number, cuerpo: string): Mensaje {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    conversacionId: '33333333-3333-4333-8333-333333333333',
    autorId: '11111111-1111-4111-8111-111111111111',
    autorNombre: 'Ana',
    tipo: 'texto',
    cuerpo,
    creadoEn: '2026-11-12T11:00:00.000Z',
    editadoEn: null,
    eliminadoEn: null,
    respondeAId: null,
    ficha: null,
    responde: null,
    estado: 'enviado',
  }
}

const SIN_ACCESO: EstadoDeReferencia = { situacion: 'sin_acceso' }

describe('useReferenciasDelHilo', () => {
  it('pide todas las referencias juntas, una sola vez, y sólo lo nuevo después', async () => {
    const leer = vi.fn((referencias: readonly { clase: string; id: string }[]) =>
      Promise.resolve({
        ok: true as const,
        data: new Map(referencias.map((r) => [`${r.clase}:${r.id}`, SIN_ACCESO])),
      }),
    )
    const primeros = [mensaje(1, `a #[lead:${L1}] y #[vehiculo:${V1}] y #[lead:${L1}]`)]
    const { result, rerender } = renderHook(
      ({ mensajes }) => useReferenciasDelHilo({ mensajes, leer }),
      {
        initialProps: { mensajes: primeros },
      },
    )
    await waitFor(() => {
      expect(result.current.resueltas.size).toBe(2)
    })
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer.mock.calls[0]?.[0]).toHaveLength(2)

    rerender({ mensajes: [...primeros, mensaje(2, `otro #[lead:${L2}] y #[lead:${L1}]`)] })
    await waitFor(() => {
      expect(result.current.resueltas.size).toBe(3)
    })
    expect(leer).toHaveBeenCalledTimes(2)
    expect(leer.mock.calls[1]?.[0]).toEqual([{ clase: 'lead', id: L2 }])
  })

  it('una lectura que falla deja las referencias en error y reintentar las pide otra vez', async () => {
    let falla = true
    const leer = vi.fn((referencias: readonly { clase: string; id: string }[]) =>
      Promise.resolve(
        falla
          ? { ok: false as const, error: { codigo: 'inesperado' as const, mensaje: 'x' } }
          : {
              ok: true as const,
              data: new Map(referencias.map((r) => [`${r.clase}:${r.id}`, SIN_ACCESO])),
            },
      ),
    )
    const mensajes = [mensaje(1, `#[lead:${L1}]`)]
    const { result } = renderHook(() => useReferenciasDelHilo({ mensajes, leer }))
    await waitFor(() => {
      expect(result.current.estadoDe({ clase: 'lead', id: L1 })).toBe('error')
    })
    falla = false
    act(() => {
      result.current.reintentar()
    })
    await waitFor(() => {
      expect(result.current.estadoDe({ clase: 'lead', id: L1 })).toEqual(SIN_ACCESO)
    })
    expect(leer).toHaveBeenCalledTimes(2)
  })
})
