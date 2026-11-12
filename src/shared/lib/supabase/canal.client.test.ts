import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Estado = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

const pedidos: { evento: string; filtro: { table: string; filter?: string; schema: string } }[] = []
let alEstado: ((estado: Estado) => void) | undefined
let alSeñal: (() => void) | undefined
const removeChannel = vi.fn()
const nombres: string[] = []
const setAuth = vi.fn(() => Promise.resolve())

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
    realtime: { setAuth },
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

// El canal se arma tras pedir el token: una vuelta de promesas.
const esperarAlCanal = () => new Promise<void>((listo) => setTimeout(listo, 0))

async function suscribir(eventos: ('INSERT' | 'UPDATE' | 'DELETE')[] = ['INSERT', 'UPDATE']) {
  const alCambiar = vi.fn()
  const alReconectar = vi.fn()
  const desuscribir = suscribirseACambios({
    tabla: 'notificaciones',
    filtro: 'usuario_id=eq.u1',
    eventos,
    alCambiar,
    alReconectar,
  })
  await esperarAlCanal()
  return { alCambiar, alReconectar, desuscribir }
}

describe('suscribirseACambios', () => {
  it('pide sólo los eventos dados, con su filtro, y nunca DELETE si no se pidió', async () => {
    await suscribir()
    expect(pedidos.map((p) => p.evento)).toEqual(['INSERT', 'UPDATE'])
    expect(pedidos.every((p) => p.filtro.filter === 'usuario_id=eq.u1')).toBe(true)
    expect(
      pedidos.every((p) => p.filtro.table === 'notificaciones' && p.filtro.schema === 'public'),
    ).toBe(true)
  })

  it('cada suscripción tiene su canal', async () => {
    await suscribir()
    await suscribir()
    expect(new Set(nombres).size).toBe(2)
  })

  it('una señal avisa sin pasar la fila', async () => {
    const { alCambiar } = await suscribir()
    alSeñal?.()
    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(alCambiar).toHaveBeenCalledWith()
  })

  it('al unirse el canal relee, la primera vez y tras cada corte', async () => {
    const { alReconectar } = await suscribir()
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).toHaveBeenCalledTimes(1)
    alEstado?.('CHANNEL_ERROR')
    expect(alReconectar).toHaveBeenCalledTimes(1)
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).toHaveBeenCalledTimes(2)
    alEstado?.('TIMED_OUT')
    alEstado?.('SUBSCRIBED')
    expect(alReconectar).toHaveBeenCalledTimes(3)
  })

  it('al volver la pestaña a visible relee; oculta no', async () => {
    const { alReconectar } = await suscribir()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(alReconectar).not.toHaveBeenCalled()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(alReconectar).toHaveBeenCalledTimes(1)
  })

  it('desuscribir quita el canal y deja de oír la pestaña y los estados', async () => {
    const { alReconectar, desuscribir } = await suscribir()
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

describe('suscribirseACambios: cuándo se une', () => {
  it('el canal se une después de pedir el token de la sesión, no antes', async () => {
    const orden: string[] = []
    setAuth.mockImplementationOnce(() => {
      orden.push('token')
      return Promise.resolve()
    })
    canal.subscribe.mockImplementationOnce((cb: (estado: Estado) => void) => {
      orden.push('unirse')
      alEstado = cb
      return canal
    })
    await suscribir()
    expect(orden).toEqual(['token', 'unirse'])
  })

  it('un desuscribir antes de que el canal exista lo cancela', async () => {
    const desuscribir = suscribirseACambios({
      tabla: 'notificaciones',
      filtro: 'usuario_id=eq.u1',
      eventos: ['INSERT'],
      alCambiar: vi.fn(),
      alReconectar: vi.fn(),
    })
    desuscribir()
    await esperarAlCanal()
    expect(canal.subscribe).not.toHaveBeenCalled()
    expect(removeChannel).not.toHaveBeenCalled()
  })
})
