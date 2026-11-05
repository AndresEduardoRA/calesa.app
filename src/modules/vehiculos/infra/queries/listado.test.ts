import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Un cliente falso: `rpc` anota la llamada y responde lo que se le pide; `from` devuelve una cadena que anota cada método y se
// resuelve con una página vacía.
const rpcs: [string, unknown][] = []
const metodos: string[] = []
let respuestaRpc: { data: unknown; error: unknown } = { data: [], error: null }

function cadena(): unknown {
  const cuerpo: Record<string, unknown> = {}
  const proxy: unknown = new Proxy(cuerpo, {
    get: (_, nombre) => {
      if (nombre === 'then') {
        return (resolver: (valor: unknown) => unknown) => resolver({ data: [], error: null })
      }
      return (...argumentos: unknown[]) => {
        metodos.push(`${String(nombre)}:${JSON.stringify(argumentos)}`)
        return proxy
      }
    },
  })
  return proxy
}

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      rpc: (nombre: string, argumentos: unknown) => {
        rpcs.push([nombre, argumentos])
        return Promise.resolve(respuestaRpc)
      },
      from: (tabla: string) => {
        metodos.push(`from:${tabla}`)
        return cadena()
      },
    }),
  ),
}))

import type { Condicion } from '../../entities/filtros'
import { buscarVehiculos } from './listado'

const ORIGEN = '00000000-0000-4000-8000-0000000000aa'
const CONDICIONES: Condicion[] = [{ tipo: 'busqueda', texto: 'toyota' }]
const base = { origenId: ORIGEN, condiciones: CONDICIONES, cursor: null, tamano: 10 }

beforeEach(() => {
  rpcs.length = 0
  metodos.length = 0
  respuestaRpc = { data: [], error: null }
})

describe('buscarVehiculos: por dónde lee', () => {
  it('con la fuente vehiculos_inventario: la función y ninguna lectura de la tabla', async () => {
    const r = await buscarVehiculos({ ...base, fuente: 'vehiculos_inventario' })
    expect(r.ok).toBe(true)
    expect(rpcs.map(([nombre]) => nombre)).toEqual(['vehiculos_inventario'])
    expect(metodos).toEqual([])
  })

  it('con la fuente vehiculos: la tabla y ninguna función', async () => {
    const r = await buscarVehiculos({ ...base, fuente: 'vehiculos' })
    expect(r.ok).toBe(true)
    expect(rpcs).toEqual([])
    expect(metodos[0]).toBe('from:vehiculos')
    expect(metodos.some((m) => m.startsWith('eq:["origen_id"'))).toBe(true)
    expect(metodos.some((m) => m.startsWith('limit:[11]'))).toBe(true)
  })

  it('si la base rechaza los filtros (22023, «filtros»): una función y después la tabla, con las mismas condiciones', async () => {
    respuestaRpc = {
      data: null,
      error: {
        code: '22023',
        hint: 'filtros',
        message: 'Los filtros del inventario no son válidos.',
      },
    }
    const r = await buscarVehiculos({ ...base, fuente: 'vehiculos_inventario' })
    expect(r.ok).toBe(true)
    expect(rpcs).toHaveLength(1)
    expect(metodos[0]).toBe('from:vehiculos')
    expect(metodos.some((m) => m.startsWith('or:') && m.includes('toyota'))).toBe(true)
  })

  it('22023 por el cursor: el error, sin leer la tabla', async () => {
    respuestaRpc = {
      data: null,
      error: { code: '22023', hint: 'cursor', message: 'Revisa el cursor.' },
    }
    const r = await buscarVehiculos({ ...base, fuente: 'vehiculos_inventario' })
    expect(r.ok).toBe(false)
    expect(metodos).toEqual([])
  })

  it('42501: sin permiso, sin leer la tabla', async () => {
    respuestaRpc = { data: null, error: { code: '42501', message: 'permission denied' } }
    const r = await buscarVehiculos({ ...base, fuente: 'vehiculos_inventario' })
    if (r.ok) throw new Error('debía fallar')
    expect(r.error.codigo).toBe('sin_permiso')
    expect(metodos).toEqual([])
  })
})
