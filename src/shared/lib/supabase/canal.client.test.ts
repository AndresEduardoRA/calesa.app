import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Estado = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

const pedidos: { evento: string; filtro: { table: string; filter?: string; schema: string } }[] = []
let alEstado: ((estado: Estado) => void) | undefined
let alSeñal: (() => void) | undefined
const removeChannel = vi.fn()
const nombres: string[] = []

const canal = {
  on: vi.fn(
    (_tipo: string, filtro: { event: string; table: string; schema: string }, cb: () => void) => {
      pedidos.push({ evento: filtro.event, filtro })
      alSeñal = cb
      return canal
    },
  ),
  subscribe: vi.fn((cb: (estado: Estado) => void) => {
    alEstado = cb
    return canal
  }),
}

vi.mock('./browser', () => ({
  createClient: () => ({
    channel: (nombre: string) => {
      nombres.push(nombre)
      return canal
    },
    removeChannel,
  }),
}))

const { suscribirseACambios } = await import('./canal.client')

beforeEach(() => {
  pedidos.length = 0
  nombres.length = 0
  alEstado = undefined
  alSeñal = undefined
})

afterEach(() => {
  vi.clearAllMocks()
})

function suscribir(eventos: ('INSERT' | 'UPDATE' | 'DELETE')[] = ['INSERT', 'UPDATE']) {
  const alCambiar = vi.fn()
  const alReconectar = vi.fn()
  const desuscribir = suscribirseACambios({
    tabla: 'notificaciones',
    filtro: 'usuario_id=eq.u1',
    eventos,
    alCambiar,
    alReconectar,
  })
  return { alCambiar, alReconectar, desuscribir }
}

describe('suscribirseACambios', () => {
  it('pide sólo los eventos dados, con su filtro, y nunca DELETE si no se pidió', () => {
    suscribir()
    expect(pedidos.map((p) => p.evento)).toEqual(['INSERT', 'UPDATE'])
    expect(pedidos.every((p) => p.filtro.filter === 'usuario_id=eq.u1')).toBe(true)
    expect(
      pedidos.every((p) => p.filtro.table === 'notificaciones' && p.filtro.schema === 'public'),
    ).toBe(true)
  })

  it('cada suscripción tiene su canal', () => {
    suscribir()
    suscribir()
    expect(new Set(nombres).size).toBe(2)
  })

  it('una señal avisa sin pasar la fila', () => {
    const { alCambiar } = suscribir()
    alSeñal?.()
    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(alCambiar).toHaveBeenCalledWith()
  })

  it('la primera conexión no es una reconexión; la que sigue a un corte, sí', () => {
    const { alReconectar } = suscribir()
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).not.toHaveBeenCalled()
    alEstado?.('CHANNEL_ERROR')
    expect(alReconectar).not.toHaveBeenCalled()
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).toHaveBeenCalledTimes(1)
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).toHaveBeenCalledTimes(1)
    alEstado?.('TIMED_OUT')
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).toHaveBeenCalledTimes(2)
  })

  it('al volver la pestaña a visible relee; oculta no', () => {
    const { alReconectar } = suscribir()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(alReconectar).not.toHaveBeenCalled()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(alReconectar).toHaveBeenCalledTimes(1)
  })

  it('desuscribir quita el canal y deja de oír la pestaña y los estados', () => {
    const { alReconectar, desuscribir } = suscribir()
    desuscribir()
    expect(removeChannel).toHaveBeenCalledWith(canal)
    document.dispatchEvent(new Event('visibilitychange'))
    alEstado?.('CLOSED')
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).not.toHaveBeenCalled()
    desuscribir()
    expect(removeChannel).toHaveBeenCalledTimes(1)
  })
})
