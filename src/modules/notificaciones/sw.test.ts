// Lo clave del service worker: la `ruta` de un aviso es lo único que no controla la base, así que sólo se abre si es
// del mismo origen. Se carga `public/sw.js` con `node:vm` y un `self` simulado (no hay service worker real en la prueba).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const ORIGEN = 'https://app.test'
// La ruta va por una variable: Vite reescribe un `new URL('…', import.meta.url)` literal.
const RUTA_DEL_SW = join(process.cwd(), 'public', 'sw.js')

type Manejador = (evento: unknown) => void

function cargarSw(
  ventanas: Array<{ url: string; focus: () => Promise<unknown>; navigate?: unknown }>,
) {
  const manejadores = new Map<string, Manejador>()
  const mostradas: Array<{ titulo: string; opciones: Record<string, unknown> }> = []
  const abiertas: string[] = []
  const self = {
    location: { origin: ORIGEN },
    addEventListener: (nombre: string, fn: Manejador) => manejadores.set(nombre, fn),
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn(),
      matchAll: vi.fn(() => Promise.resolve(ventanas)),
      openWindow: vi.fn((url: string) => {
        abiertas.push(url)
        return Promise.resolve()
      }),
    },
    registration: {
      showNotification: vi.fn((titulo: string, opciones: Record<string, unknown>) => {
        mostradas.push({ titulo, opciones })
        return Promise.resolve()
      }),
    },
  }
  vm.runInNewContext(readFileSync(RUTA_DEL_SW, 'utf8'), { self, URL, console })
  return { manejadores, mostradas, abiertas, self }
}

async function tocar(sw: ReturnType<typeof cargarSw>, ruta: unknown) {
  const cerrar = vi.fn()
  let promesa: Promise<unknown> = Promise.resolve()
  sw.manejadores.get('notificationclick')?.({
    notification: { close: cerrar, data: ruta === undefined ? undefined : { ruta } },
    waitUntil: (p: Promise<unknown>) => {
      promesa = p
    },
  })
  await promesa
  expect(cerrar).toHaveBeenCalledOnce()
}

describe('notificationclick', () => {
  it.each([
    ['una ruta externa', 'https://otro.test/robar'],
    ['una ruta con //', '//otro.test/robar'],
    ['javascript:', 'javascript:alert(1)'],
    ['una ruta con /\\', '/\\otro.test'],
    ['una ruta que no es texto', 42],
    ['sin ruta', null],
    ['sin datos', undefined],
  ])('con %s abre /notificaciones', async (_nombre, ruta) => {
    const sw = cargarSw([])
    await tocar(sw, ruta)
    expect(sw.abiertas).toEqual([`${ORIGEN}/notificaciones`])
  })

  it('una ruta interna se abre tal cual, con su consulta', async () => {
    const sw = cargarSw([])
    await tocar(sw, '/vehiculos/abc?panel=x')
    expect(sw.abiertas).toEqual([`${ORIGEN}/vehiculos/abc?panel=x`])
  })

  it('con una ventana abierta del mismo origen la enfoca y la lleva a la ruta', async () => {
    const navigate = vi.fn(() => Promise.resolve(undefined))
    const focus = vi.fn(() => Promise.resolve({ navigate }))
    const sw = cargarSw([{ url: `${ORIGEN}/perfil`, focus }])
    await tocar(sw, '/agenda')
    expect(focus).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith(`${ORIGEN}/agenda`)
    expect(sw.abiertas).toEqual([])
  })

  it('una ventana de otro origen no se usa', async () => {
    const focus = vi.fn(() => Promise.resolve({}))
    const sw = cargarSw([{ url: 'https://otro.test/', focus }])
    await tocar(sw, '/agenda')
    expect(focus).not.toHaveBeenCalled()
    expect(sw.abiertas).toEqual([`${ORIGEN}/agenda`])
  })
})

describe('push', () => {
  function recibir(sw: ReturnType<typeof cargarSw>, json: () => unknown, hayDatos = true) {
    let promesa: Promise<unknown> = Promise.resolve()
    sw.manejadores.get('push')?.({
      data: hayDatos ? { json } : null,
      waitUntil: (p: Promise<unknown>) => {
        promesa = p
      },
    })
    return promesa
  }

  it('muestra el título, el cuerpo y guarda la ruta', async () => {
    const sw = cargarSw([])
    await recibir(sw, () => ({ titulo: 'Tarea nueva', cuerpo: 'Llamar', ruta: '/tareas' }))
    expect(sw.mostradas).toHaveLength(1)
    expect(sw.mostradas[0]?.titulo).toBe('Tarea nueva')
    expect(sw.mostradas[0]?.opciones).toMatchObject({ body: 'Llamar', data: { ruta: '/tareas' } })
  })

  it('una carga ilegible no lanza y muestra el aviso genérico sin cuerpo', async () => {
    const sw = cargarSw([])
    await recibir(sw, () => {
      throw new SyntaxError('no es json')
    })
    expect(sw.mostradas[0]?.titulo).toBe('Tienes un aviso nuevo')
    expect(sw.mostradas[0]?.opciones['body']).toBeUndefined()
  })

  it('sin datos tampoco lanza', async () => {
    const sw = cargarSw([])
    await recibir(sw, () => ({}), false)
    expect(sw.mostradas[0]?.titulo).toBe('Tienes un aviso nuevo')
  })
})
