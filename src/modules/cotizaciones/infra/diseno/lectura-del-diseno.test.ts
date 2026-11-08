import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { leerDisenoSobre, leerNivelesSobre } from './lectura-del-diseno'

type Respuesta = { data: unknown; error: { message: string; code?: string } | null }

// Un cliente que responde `formulas` según el `estado` que se pide y cuenta las llamadas.
function clienteFalso(porEstado: Record<string, Respuesta>, niveles?: Respuesta) {
  const llamadas: string[] = []
  const cliente = {
    from: (tabla: string) => {
      llamadas.push(tabla)
      let estado = ''
      const consulta: Record<string, unknown> = {}
      for (const metodo of ['select', 'order', 'limit']) consulta[metodo] = () => consulta
      consulta['eq'] = (columna: string, valor: string) => {
        if (columna === 'estado') estado = valor
        return consulta
      }
      consulta['then'] = (resolver: (valor: unknown) => unknown) =>
        Promise.resolve(
          (tabla === 'formulas' ? porEstado[estado] : niveles) ?? { data: [], error: null },
        ).then(resolver)
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const DEFINICION = { nodos: [{ id: 'a', tipo: 'input', etiqueta: 'A' }] }
const DISENO = {
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [
    {
      id: 's',
      presentacion: 'principal',
      items: [{ tipo: 'celda', nodo: 'a', ancho: 'completo' }],
    },
  ],
  tarjeta_total: { nodo: 'a', secundarios: [] },
}
const fila = (estado: string, id: string, extra: object = {}) => ({
  id,
  estado,
  definicion: DEFINICION,
  params: { flete: 900 },
  diseno: DISENO,
  nota: null,
  actualizado_en: '2026-11-08T10:00:00.123456+00:00',
  ...extra,
})
const BORRADOR = '22222222-2222-4222-8222-222222222222'
const PUBLICADA = '33333333-3333-4333-8333-333333333333'

describe('leerDisenoSobre', () => {
  it('T6 · el borrador gana a la publicada', async () => {
    const { cliente } = clienteFalso({
      borrador: { data: [fila('borrador', BORRADOR)], error: null },
      publicada: { data: [fila('publicada', PUBLICADA)], error: null },
    })
    const r = await leerDisenoSobre(cliente, ORIGEN)
    expect(r.ok && r.data?.id).toBe(BORRADOR)
    expect(r.ok && r.data?.actualizadoEn).toBe('2026-11-08T10:00:00.123456+00:00')
  })

  it('T6 · sin borrador abre la publicada; sin ninguna, nulo; el diseño nulo llega nulo', async () => {
    const sinBorrador = clienteFalso({
      borrador: { data: [], error: null },
      publicada: { data: [fila('publicada', PUBLICADA, { diseno: null })], error: null },
    })
    const r = await leerDisenoSobre(sinBorrador.cliente, ORIGEN)
    expect(r.ok && r.data?.estado).toBe('publicada')
    expect(r.ok && r.data?.diseno).toBeNull()

    const nada = await leerDisenoSobre(clienteFalso({}).cliente, ORIGEN)
    expect(nada).toEqual({ ok: true, data: null })
  })

  it('T6 · una fila con definición sin forma es un fallo «inesperado»; un error de la base, su error', async () => {
    const malo = clienteFalso({
      borrador: { data: [fila('borrador', BORRADOR, { definicion: { nodos: 3 } })], error: null },
    })
    const r = await leerDisenoSobre(malo.cliente, ORIGEN)
    expect(!r.ok && r.error.codigo).toBe('inesperado')

    const roto = clienteFalso({ borrador: { data: null, error: { message: 'x', code: '42501' } } })
    expect((await leerDisenoSobre(roto.cliente, ORIGEN)).ok).toBe(false)
  })

  it('un origen que no es un guid no consulta', async () => {
    const { cliente, llamadas } = clienteFalso({})
    const r = await leerDisenoSobre(cliente, 'no-es-guid')
    expect(r.ok).toBe(false)
    expect(llamadas).toEqual([])
  })
})

describe('leerNivelesSobre', () => {
  it('marca como retirado el que tiene retirado_en', async () => {
    const { cliente } = clienteFalso(
      {},
      {
        data: [
          { clave: 'costos', nombre: 'Costos', retirado_en: null },
          { clave: 'viejo', nombre: 'Viejo', retirado_en: '2026-01-01T00:00:00+00:00' },
        ],
        error: null,
      },
    )
    const r = await leerNivelesSobre(cliente)
    expect(r.ok && r.data).toEqual([
      { clave: 'costos', nombre: 'Costos', retirado: false },
      { clave: 'viejo', nombre: 'Viejo', retirado: true },
    ])
  })
})
