import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  aprobar: vi.fn(),
  toasts: {
    avisar: vi.fn(),
    avisarConDeshacer: vi.fn(),
    avisarError: vi.fn(),
    avisarExito: vi.fn(),
  },
}))

vi.mock('../actions/aprobar', () => ({ aprobarCotizacion: h.aprobar }))
vi.mock('@/shared/ui/toasts', () => h.toasts)

import { aprobarLaCotizacion } from './aprobar-la-cotizacion'

const ID = '22222222-2222-4222-8222-222222222222'
const ANTERIOR = '77777777-7777-4777-8777-777777777777'
const VERSION = '2026-11-14T10:00:00.123456+00:00'
const VERSION_ANTERIOR = '2026-11-13T09:00:00.654321+00:00'

const entra = (anterior: boolean) => ({
  data: {
    ok: true,
    data: {
      cotizacion: { id: ID, numero: 7, actualizadoEn: VERSION },
      anterior: anterior ? { id: ANTERIOR, numero: 3, actualizadoEn: VERSION_ANTERIOR } : null,
    },
  },
})
const falla = (codigo: string, mensaje: string) => ({
  data: { ok: false, error: { codigo, mensaje } },
})

const pedido = () => {
  const cambios: boolean[] = []
  return {
    cambios,
    datos: {
      id: ID,
      numero: 7,
      actualizadoEn: VERSION,
      alCambiar: (aprobada: boolean) => {
        cambios.push(aprobada)
      },
    },
  }
}

beforeEach(() => {
  Object.values(h.toasts).forEach((f) => f.mockClear())
  h.aprobar.mockReset()
})

describe('aprobarLaCotizacion', () => {
  it('entra sin anterior: cambia a aprobada y avisa sin «Deshacer»', async () => {
    h.aprobar.mockResolvedValue(entra(false))
    const p = pedido()
    await aprobarLaCotizacion(p.datos)
    expect(h.aprobar).toHaveBeenCalledWith({ id: ID, actualizadoEn: VERSION })
    expect(p.cambios).toEqual([true])
    expect(h.toasts.avisarExito).toHaveBeenCalledWith('La n.º 7 es la aprobada del vehículo.')
    expect(h.toasts.avisarConDeshacer).not.toHaveBeenCalled()
  })

  it('entra con anterior: ofrece «Deshacer», que aprueba la anterior con su versión', async () => {
    h.aprobar.mockResolvedValueOnce(entra(true))
    const p = pedido()
    await aprobarLaCotizacion(p.datos)
    expect(h.toasts.avisarConDeshacer).toHaveBeenCalledTimes(1)
    const [mensaje, alDeshacer] = h.toasts.avisarConDeshacer.mock.calls[0] as [string, () => void]
    expect(mensaje).toBe('La n.º 7 es la aprobada del vehículo.')

    h.aprobar.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          cotizacion: { id: ANTERIOR, numero: 3, actualizadoEn: VERSION_ANTERIOR },
          anterior: null,
        },
      },
    })
    alDeshacer()
    await vi.waitFor(() => {
      expect(p.cambios).toEqual([true, false])
    })
    expect(h.aprobar).toHaveBeenLastCalledWith({ id: ANTERIOR, actualizadoEn: VERSION_ANTERIOR })
    expect(h.toasts.avisarExito).toHaveBeenCalledWith('Volvió a ser la aprobada la n.º 3.')
  })

  it('«Deshacer» que choca con otra versión dice el conflicto y no cambia nada', async () => {
    h.aprobar.mockResolvedValueOnce(entra(true))
    const p = pedido()
    await aprobarLaCotizacion(p.datos)
    const [, alDeshacer] = h.toasts.avisarConDeshacer.mock.calls[0] as [string, () => void]
    h.aprobar.mockResolvedValueOnce(falla('conflicto', 'Ana cambió esta cotización hace 1 minuto.'))
    alDeshacer()
    await vi.waitFor(() => {
      expect(h.toasts.avisarError).toHaveBeenCalled()
    })
    expect(p.cambios).toEqual([true])
  })
})

describe('aprobarLaCotizacion, lo que sale mal', () => {
  it('un conflicto dice el texto de la base y ofrece «Recargar»; no cambia nada', async () => {
    h.aprobar.mockResolvedValue(falla('conflicto', 'Ana cambió esta cotización hace 2 minutos.'))
    const p = pedido()
    await aprobarLaCotizacion(p.datos)
    expect(p.cambios).toEqual([])
    expect(h.toasts.avisarError).toHaveBeenCalledWith(
      { codigo: 'conflicto', mensaje: 'Ana cambió esta cotización hace 2 minutos.' },
      { acciones: { acciones: [{ tipo: 'recargar', etiqueta: 'Recargar' }], pedido: null } },
    )
  })

  it('una regla dice el texto de la base, sin «Recargar»', async () => {
    h.aprobar.mockResolvedValue(
      falla('regla', 'Una cotización inválida no se aprueba: reactívala primero.'),
    )
    await aprobarLaCotizacion(pedido().datos)
    expect(h.toasts.avisarError).toHaveBeenCalledWith(
      { codigo: 'regla', mensaje: 'Una cotización inválida no se aprueba: reactívala primero.' },
      {},
    )
  })

  it('sin red dice que no se aprobó y no pide recargar', async () => {
    h.aprobar.mockRejectedValue(new TypeError('Failed to fetch'))
    const p = pedido()
    await aprobarLaCotizacion(p.datos)
    expect(p.cambios).toEqual([])
    expect(h.toasts.avisarError).toHaveBeenCalledWith(
      { codigo: 'inesperado', mensaje: 'Sin conexión: no se aprobó. Reintenta cuando vuelva.' },
      {},
    )
  })

  it('un error inesperado tras llegar al servidor pide recargar para verlo', async () => {
    h.aprobar.mockResolvedValue(falla('inesperado', 'Algo salió mal.'))
    await aprobarLaCotizacion(pedido().datos)
    expect(h.toasts.avisarError).toHaveBeenCalledWith(
      { codigo: 'inesperado', mensaje: 'No sabemos si se aprobó: recarga para verlo.' },
      { acciones: { acciones: [{ tipo: 'recargar', etiqueta: 'Recargar' }], pedido: null } },
    )
  })
})
