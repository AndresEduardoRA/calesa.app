import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PedidoDeCambiarConstante,
  ResultadoDelCambio,
} from '../../../entities/formula/repositorio'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const NUEVA = '33333333-3333-4333-8333-333333333333'
const PERSONA = '55555555-5555-4555-8555-555555555555'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as PedidoDeCambiarConstante[],
  respuesta: null as ResultadoDelCambio | null,
  cache: {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    updateTag: vi.fn(),
    refresh: vi.fn(),
  },
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
vi.mock('../../../areas/formula/composicion', () => ({
  repositorioDeLaFormula: {
    cambiarConstante: (pedido: PedidoDeCambiarConstante) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { cambiarConstante } = await import('./cambiar-constante')

const pedido = { origenId: ORIGEN, nodo: 'fees_pct', valor: 0.13, publicadaEsperada: PUBLICADA }
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: NUEVA }
  for (const espia of Object.values(h.cache)) {
    espia.mockClear()
  }
})

describe('cambiarConstante', () => {
  it('sin cotizaciones.configurar del origen no escribe', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    const respuesta = await cambiarConstante(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_FORMULA },
    })
    expect(h.pedidos).toEqual([])
  })

  it('entra: manda la esperada y el valor tal cual (la action no convierte) y devuelve el id nuevo', async () => {
    const respuesta = await cambiarConstante(pedido)
    expect(h.pedidos).toEqual([pedido])
    expect(respuesta.data).toEqual({ ok: true, data: NUEVA })
  })

  it('sin revalidar ni refrescar: la hoja desde la que se llama no se vuelve a dibujar', async () => {
    await cambiarConstante(pedido)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
    expect(h.cache.revalidateTag).not.toHaveBeenCalled()
    expect(h.cache.updateTag).not.toHaveBeenCalled()
    expect(h.cache.refresh).not.toHaveBeenCalled()
  })

  it('el campo «valor» del adaptador llega como porCampo.valor', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'regla', mensaje: 'La constante ya tiene ese valor.' },
      campo: 'valor',
    }
    const respuesta = await cambiarConstante(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: 'La constante ya tiene ese valor.' },
      porCampo: { valor: 'La constante ya tiene ese valor.' },
    })
  })

  it('un conflicto llega tal cual, sin porCampo', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 3.' },
    }
    const respuesta = await cambiarConstante(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana publicó la versión 3.' },
    })
  })

  it('una entrada que no pasa el esquema no llega al repositorio', async () => {
    const respuesta = await cambiarConstante({ ...pedido, publicadaEsperada: 'x', nodo: 'No Vale' })
    expect(respuesta.data).toBeUndefined()
    expect(respuesta.validationErrors).toBeDefined()
    expect(h.pedidos).toEqual([])
  })
})

// La misma regla, leyendo el archivo: no importa `next/cache` (en Next 16.4.3 `revalidatePath`, `revalidateTag`, `updateTag` y `refresh` vuelven a dibujar la página
// desde la que se llama, y la hoja se remontaría con otra abierta). La ruta va por una variable: Vite reescribe un `new URL(…, import.meta.url)` literal.
describe('cambiar-constante.ts, leído', () => {
  const nombre = 'cambiar-constante.ts'
  const codigo = readFileSync(join(dirname(fileURLToPath(import.meta.url)), nombre), 'utf8')
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('//'))
    .join('\n')

  it('no importa next/cache ni llama a revalidar o refrescar', () => {
    expect(codigo).not.toMatch(/next\/cache/)
    expect(codigo).not.toMatch(/\b(revalidatePath|revalidateTag|updateTag|refresh)\s*\(/)
  })
})
