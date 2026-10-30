import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Fuentes } from '../../../entities/esquema'
import type { FormularioDeVehiculo } from '../../alta/hooks/use-formulario-de-vehiculo'
import { useAltaPorSubasta } from './use-alta-por-subasta'

const consultar = vi.fn()
vi.mock('./use-consulta-de-subasta', () => ({
  useConsultaDeSubasta: () => ({
    consultando: false,
    lineas: [],
    recortadas: 0,
    fijarEstado: vi.fn(),
    consultar,
    reintentar: vi.fn(),
  }),
}))
vi.mock('./use-alta-de-lista', () => ({
  useAltaDeLista: () => ({ progreso: null, guardarListas: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function montar(extra: { textoInicial?: string; consultarAlMontar?: boolean } = {}) {
  return renderHook(
    () =>
      useAltaPorSubasta({
        origenId: 'o',
        campos: [],
        fuentes: {} as Fuentes,
        estado: { enCurso: false } as unknown as FormularioDeVehiculo,
        traerFotos: vi.fn(),
        guardado: null,
        ...extra,
      }),
    { reactStrictMode: true },
  )
}

describe('useAltaPorSubasta: lo que arranca pegado', () => {
  it('sin pedirlo arranca vacío y no consulta (el inventario no pasa nada)', () => {
    const { result } = montar()
    expect(result.current.texto).toBe('')
    expect(consultar).not.toHaveBeenCalled()
  })

  it('con texto inicial lo muestra pero no consulta si no se pidió', () => {
    const { result } = montar({ textoInicial: '58540656' })
    expect(result.current.texto).toBe('58540656')
    expect(consultar).not.toHaveBeenCalled()
  })

  it('al pedirlo consulta una sola vez con ese texto, también con el modo estricto de React', async () => {
    consultar.mockResolvedValue([])
    const { rerender } = montar({ textoInicial: '58540656', consultarAlMontar: true })
    await waitFor(() => expect(consultar).toHaveBeenCalledWith('58540656'))
    rerender()
    expect(consultar).toHaveBeenCalledTimes(1)
  })
})
