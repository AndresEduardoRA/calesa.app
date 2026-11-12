import { beforeEach, describe, expect, it, vi } from 'vitest'

const PERSONA = '55555555-5555-4555-8555-555555555555'
const CATEGORIA = '11111111-1111-4111-8111-111111111111'

type Concesion = { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }
const concede = (clave: string): Concesion => ({ clave, origen_id: null, alcance: 'todos' })

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  llamadas: [] as { metodo: string; pedido: unknown }[],
  cache: { revalidatePath: vi.fn(), revalidateTag: vi.fn() },
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => h.cache)
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: PERSONA } } }) },
      rpc: (nombre: string) =>
        Promise.resolve(
          nombre === 'mis_permisos'
            ? { data: h.permisos, error: null }
            : { data: null, error: { message: `rpc inesperada: ${nombre}` } },
        ),
    }),
}))
const metodo = (nombre: string) => (pedido: unknown) => {
  h.llamadas.push({ metodo: nombre, pedido })
  return Promise.resolve({ ok: true, data: null })
}
vi.mock('../../../../areas/contenido/composicion', () => ({
  escribirCategorias: {
    crear: metodo('crear'),
    renombrar: metodo('renombrar'),
    activar: metodo('activar'),
    mover: metodo('mover'),
    eliminar: metodo('eliminar'),
  },
}))

const { crearCategoria } = await import('./crear-categoria')
const { renombrarCategoria } = await import('./renombrar-categoria')
const { activarCategoria } = await import('./activar-categoria')
const { moverCategoria } = await import('./mover-categoria')
const { eliminarCategoria } = await import('./eliminar-categoria')

const CASOS = [
  ['crear', () => crearCategoria({ nombre: 'Guías' })],
  ['renombrar', () => renombrarCategoria({ id: CATEGORIA, nombre: 'Nueva' })],
  ['activar', () => activarCategoria({ id: CATEGORIA, activa: false })],
  ['mover', () => moverCategoria({ id: CATEGORIA, direccion: 'subir' })],
  ['eliminar', () => eliminarCategoria({ id: CATEGORIA })],
] as const

beforeEach(() => {
  h.permisos = []
  h.llamadas = []
  vi.clearAllMocks()
})

describe.each(CASOS)('categorías · %s: permisos antes de escribir', (nombre, llamar) => {
  it('sin web.contenido.gestionar no llama a la base', async () => {
    h.permisos = [concede('web.guias.publicar')]
    const respuesta = await llamar()
    expect(respuesta.data).toMatchObject({ ok: false, error: { codigo: 'sin_permiso' } })
    expect(h.llamadas).toHaveLength(0)
  })

  it('con web.contenido.gestionar llama una vez y revalida la pantalla', async () => {
    h.permisos = [concede('web.contenido.gestionar')]
    const respuesta = await llamar()
    expect(respuesta.data).toEqual({ ok: true, data: null })
    expect(h.llamadas.map((llamada) => llamada.metodo)).toEqual([nombre])
    expect(h.cache.revalidatePath).toHaveBeenCalledTimes(1)
  })
})

describe('categorías: lo que no llega a la base', () => {
  it('un nombre vacío o un id mal formado no se escribe', async () => {
    h.permisos = [concede('web.contenido.gestionar')]
    const vacio = await crearCategoria({ nombre: '   ' })
    expect(vacio.validationErrors?.fieldErrors.nombre).toBeDefined()
    const malId = await eliminarCategoria({ id: 'no-es-un-id' })
    expect(malId.validationErrors?.fieldErrors.id).toBeDefined()
    expect(h.llamadas).toHaveLength(0)
  })
})
