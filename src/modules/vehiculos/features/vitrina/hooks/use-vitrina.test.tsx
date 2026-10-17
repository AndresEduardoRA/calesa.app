import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Vehiculo } from '../../../entities/vehiculo'
import { useVitrina } from './use-vitrina'

vi.mock('../actions/publicar-en-vitrina', () => ({ publicarEnVitrina: vi.fn() }))

afterEach(cleanup)

const vehiculo = {
  id: 'v-1',
  actualizadoEn: '2026-10-17T10:00:00.000Z',
  publicadoWeb: false,
  precioWeb: 21500,
  precioWebHasta: null,
  precioWebNota: null,
  destacadoWeb: false,
} as unknown as Vehiculo

// Lo que un aviso que sale de la pantalla («Abrir ficha») consulta antes de irse: ¿hay algo escrito sin guardar?
describe('useVitrina: hayCambios', () => {
  it('lo guardado no es algo escrito', () => {
    const { result } = renderHook(() => useVitrina(vehiculo, vi.fn()))
    expect(result.current.hayCambios).toBe(false)
  })

  it('cambiar el precio o el interruptor lo marca, y volver a lo guardado lo desmarca', () => {
    const { result } = renderHook(() => useVitrina(vehiculo, vi.fn()))
    act(() => {
      result.current.cambiar({ precio: '22000' })
    })
    expect(result.current.hayCambios).toBe(true)
    act(() => {
      result.current.cambiar({ precio: '21500' })
    })
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.cambiar({ publicado: true })
    })
    expect(result.current.hayCambios).toBe(true)
  })
})
