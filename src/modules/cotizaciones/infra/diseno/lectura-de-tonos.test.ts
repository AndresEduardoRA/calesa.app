import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { leerTonosSobre } from './lectura-de-tonos'

type Respuesta = { data: unknown; error: { message: string; code?: string } | null }

// Un cliente que anota lo que se pide a `tonos` (tabla, orden, tope) y responde lo dado.
function clienteFalso(respuesta: Respuesta) {
  const pedido: { tabla?: string; orden?: string; tope?: number } = {}
  const consulta: Record<string, unknown> = {}
  consulta['select'] = () => consulta
  consulta['order'] = (columna: string) => {
    pedido.orden = columna
    return consulta
  }
  consulta['limit'] = (n: number) => {
    pedido.tope = n
    return consulta
  }
  consulta['then'] = (resolver: (valor: unknown) => unknown) =>
    Promise.resolve(respuesta).then(resolver)
  const cliente = {
    from: (tabla: string) => {
      pedido.tabla = tabla
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, pedido }
}

const fila = (extra: object = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  clave: 'amarillo',
  nombre: 'Amarillo',
  actualizado_en: '2026-11-08T10:00:00.123456+00:00',
  claro_fondo: '#fff7d6',
  claro_borde: '#e9d27a',
  claro_tinta: '#1b2130',
  oscuro_fondo: '#3e3f3c',
  oscuro_borde: '#797251',
  oscuro_tinta: '#f2f4f8',
  ...extra,
})

describe('leerTonosSobre', () => {
  it('T2 · lee la tabla por nombre con el tope de la base y arma los colores por tema', async () => {
    const { cliente, pedido } = clienteFalso({ data: [fila()], error: null })
    const r = await leerTonosSobre(cliente)
    expect(pedido).toEqual({ tabla: 'tonos', orden: 'nombre', tope: 24 })
    expect(r).toEqual({
      ok: true,
      data: {
        tope: 24,
        tonos: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            clave: 'amarillo',
            nombre: 'Amarillo',
            actualizadoEn: '2026-11-08T10:00:00.123456+00:00',
            colores: {
              claro: { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' },
              oscuro: { fondo: '#3e3f3c', borde: '#797251', tinta: '#f2f4f8' },
            },
          },
        ],
      },
    })
  })

  it('T2 · una fila con un color mal escrito es «No pudimos leer los tonos.»', async () => {
    const { cliente } = clienteFalso({ data: [fila({ claro_tinta: 'azul' })], error: null })
    const r = await leerTonosSobre(cliente)
    expect(!r.ok && r.error).toEqual({
      codigo: 'inesperado',
      mensaje: 'No pudimos leer los tonos.',
    })
  })

  it('T2 · un error de la base llega como error', async () => {
    const { cliente } = clienteFalso({ data: null, error: { message: 'x', code: '42501' } })
    expect((await leerTonosSobre(cliente)).ok).toBe(false)
  })
})
