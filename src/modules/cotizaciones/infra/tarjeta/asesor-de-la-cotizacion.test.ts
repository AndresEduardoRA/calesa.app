import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const lecturas: unknown[][] = []
let fila: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: (tabla: string) => ({
        select: (columnas: string) => ({
          eq: (columna: string, valor: string) => ({
            limit: (n: number) => {
              lecturas.push([tabla, columnas, columna, valor, n])
              return Promise.resolve(fila)
            },
          }),
        }),
      }),
    }),
  ),
}))

import { getAsesorDeLaCotizacion } from './asesor-de-la-cotizacion'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

describe('getAsesorDeLaCotizacion: a quien creó la cotización', () => {
  beforeEach(() => {
    lecturas.length = 0
    fila = { data: [], error: null }
  })

  it('pide la columna embebida del autor por clave primaria con limit(1)', async () => {
    await getAsesorDeLaCotizacion(ID)
    expect(lecturas).toEqual([
      ['cotizaciones', 'perfiles!cotizaciones_creado_por_fkey(nombre, email)', 'id', ID, 1],
    ])
  })

  it('da el nombre o, sin él, la parte local del correo', async () => {
    fila = { data: [{ perfiles: { nombre: 'Ana Pérez', email: 'ana@x.test' } }], error: null }
    expect(await getAsesorDeLaCotizacion(ID)).toEqual({ ok: true, data: 'Ana Pérez' })
    fila = { data: [{ perfiles: { nombre: ' ', email: 'ana@x.test' } }], error: null }
    expect(await getAsesorDeLaCotizacion(ID)).toEqual({ ok: true, data: 'ana' })
  })

  it('sin fila o sin autor, nulo', async () => {
    expect(await getAsesorDeLaCotizacion(ID)).toEqual({ ok: true, data: null })
    fila = { data: [{ perfiles: null }], error: null }
    expect(await getAsesorDeLaCotizacion(ID)).toEqual({ ok: true, data: null })
  })

  it('un error de la base o una forma rara es un fallo, sin su mensaje', async () => {
    fila = { data: null, error: { message: 'boom', code: 'XX000', details: '', hint: '' } }
    expect((await getAsesorDeLaCotizacion(ID)).ok).toBe(false)
    fila = { data: [{ otra: 1 }], error: null }
    expect((await getAsesorDeLaCotizacion(ID)).ok).toBe(false)
  })
})
