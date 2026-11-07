import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { leerTipoCambioDelNodoSobre } from './consulta-del-tipo-cambio-del-nodo'

// Un cliente que anota cada RPC y responde lo que se le da.
function clienteFalso(respuesta: {
  data: unknown
  error: { message: string; code?: string } | null
}) {
  const llamadas: [string, unknown][] = []
  const cliente = {
    rpc: (nombre: string, args: unknown) => {
      llamadas.push([nombre, args])
      return Promise.resolve(respuesta)
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, llamadas }
}

const FORMULA = '22222222-2222-4222-8222-222222222222'
const TIPO = '33333333-3333-4333-8333-333333333333'
const FILA = {
  id: TIPO,
  clave: 'oficial',
  nombre: 'Oficial',
  moneda_de: 'USD',
  moneda_a: 'BOB',
  valor: 6.96,
  activo: true,
  actualizado_en: '2026-11-06T22:27:12.123456-04:00',
}

describe('leerTipoCambioDelNodoSobre', () => {
  it('pide la RPC con la versión y el nodo, y da la fila en camelCase con actualizadoEn intacto', async () => {
    const { cliente, llamadas } = clienteFalso({ data: FILA, error: null })
    expect(await leerTipoCambioDelNodoSobre(cliente, FORMULA, 'tc')).toEqual({
      ok: true,
      data: {
        id: TIPO,
        clave: 'oficial',
        nombre: 'Oficial',
        monedaDe: 'USD',
        monedaA: 'BOB',
        valor: 6.96,
        activo: true,
        actualizadoEn: '2026-11-06T22:27:12.123456-04:00',
      },
    })
    expect(llamadas).toEqual([
      ['formula_tipo_cambio_del_nodo', { p_formula: FORMULA, p_nodo: 'tc' }],
    ])
  })

  it('desactivado llega con activo false', async () => {
    const { cliente } = clienteFalso({ data: { ...FILA, activo: false }, error: null })
    const leido = await leerTipoCambioDelNodoSobre(cliente, FORMULA, 'tc')
    expect(leido.ok && leido.data?.activo).toBe(false)
  })

  it('null (un nodo que no se ve, no existe o no tiene tarifa) es ok(null)', async () => {
    const { cliente } = clienteFalso({ data: null, error: null })
    expect(await leerTipoCambioDelNodoSobre(cliente, FORMULA, 'tc')).toEqual({
      ok: true,
      data: null,
    })
  })

  it('un error de la base es un error con su código', async () => {
    const { cliente } = clienteFalso({
      data: null,
      error: { message: 'No tienes el permiso «empresa.tipos_cambio.gestionar».', code: '42501' },
    })
    const leido = await leerTipoCambioDelNodoSobre(cliente, FORMULA, 'tc')
    expect(leido.ok ? null : leido.error.codigo).toBe('sin_permiso')
  })

  it.each([
    ['sin id', { ...FILA, id: undefined }],
    ['con valor 0', { ...FILA, valor: 0 }],
    ['con valor que no es número', { ...FILA, valor: '6.96' }],
    ['sin actualizado_en', { ...FILA, actualizado_en: '' }],
  ])('una respuesta %s es inesperada', async (_, data) => {
    const { cliente } = clienteFalso({ data, error: null })
    const leido = await leerTipoCambioDelNodoSobre(cliente, FORMULA, 'tc')
    expect(leido.ok ? null : leido.error).toEqual({
      codigo: 'inesperado',
      mensaje: 'No pudimos leer el tipo de cambio.',
    })
  })
})
