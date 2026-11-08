import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/shared/types/database.types'
import { leerPlantillaSobre } from './lectura-sobre'

type Respuesta = { data: unknown; error: { message: string; code?: string } | null }

// Un cliente que responde por tabla y cuenta las llamadas.
function clienteFalso(porTabla: Record<string, Respuesta>) {
  const tablas: string[] = []
  const cliente = {
    from: (nombre: string) => {
      tablas.push(nombre)
      const consulta: Record<string, unknown> = {}
      for (const metodo of ['select', 'eq', 'in', 'order', 'limit'])
        consulta[metodo] = () => consulta
      consulta['then'] = (resolver: (valor: unknown) => unknown) =>
        Promise.resolve(porTabla[nombre] ?? { data: [], error: null }).then(resolver)
      return consulta
    },
  }
  return { cliente: cliente as unknown as SupabaseClient<Database>, tablas }
}

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const BORRADOR = '22222222-2222-4222-8222-222222222222'
const PUBLICADA = '33333333-3333-4333-8333-333333333333'
const FORMULA = '44444444-4444-4444-8444-444444444444'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const PLANTILLA = {
  grupos: [{ grupo: 'compra', tono: 'verde' }],
  total: { etiqueta: 'TOTAL' },
  logo: true,
  columnas: { leyenda: true, plazo: false, tipo_cambio: false },
}
const DEFINICION = {
  nodos: [
    { id: 'tc', tipo: 'tipo_cambio', etiqueta: 'TC', clave: 'oficial' },
    { id: 'flete', tipo: 'constante', etiqueta: 'Flete', texto: '=900' },
  ],
  buckets: { b: 'tc' },
}
const filaBorrador = {
  id: BORRADOR,
  estado: 'borrador',
  version: null,
  definicion: PLANTILLA,
  nota: null,
  actualizado_en: HORA,
  publicado_en: null,
}
const filaPublicada = {
  ...filaBorrador,
  id: PUBLICADA,
  estado: 'publicada',
  version: 2,
  nota: 'Primera',
  publicado_en: '2026-11-06T10:00:00.5+00:00',
}
const filaFormula = {
  id: FORMULA,
  version: 4,
  definicion: DEFINICION,
  diseno: null,
  visibilidad: { flete: { ver: 'todos' } },
}
const filaDeTono = (clave: string, nombre: string, c: string) => ({
  clave,
  nombre,
  claro_fondo: `#${c}1`.padEnd(7, '0'),
  claro_borde: `#${c}2`.padEnd(7, '0'),
  claro_tinta: `#${c}3`.padEnd(7, '0'),
  oscuro_fondo: `#${c}4`.padEnd(7, '0'),
  oscuro_borde: `#${c}5`.padEnd(7, '0'),
  oscuro_tinta: `#${c}6`.padEnd(7, '0'),
})
const FILAS_DE_TONOS = [filaDeTono('verde', 'Verde', 'a'), filaDeTono('azul', 'Azul', 'b')]
// Los seis colores de la base llegan al editor como `claro` y `oscuro` (4.19-4).
const TONOS = [
  {
    clave: 'verde',
    nombre: 'Verde',
    claro: { fondo: '#a10000', borde: '#a20000', tinta: '#a30000' },
    oscuro: { fondo: '#a40000', borde: '#a50000', tinta: '#a60000' },
  },
  {
    clave: 'azul',
    nombre: 'Azul',
    claro: { fondo: '#b10000', borde: '#b20000', tinta: '#b30000' },
    oscuro: { fondo: '#b40000', borde: '#b50000', tinta: '#b60000' },
  },
]
const ok = (data: unknown): Respuesta => ({ data, error: null })

describe('leerPlantillaSobre', () => {
  it('un origen que no es guid no llama a la base', async () => {
    const { cliente, tablas } = clienteFalso({})
    const r = await leerPlantillaSobre(cliente, 'no-es-guid')
    expect(r).toEqual({
      ok: false,
      error: { codigo: 'validacion', mensaje: 'Ese origen no es válido.' },
    })
    expect(tablas).toEqual([])
  })

  it('lee las tres tablas, y el borrador y la publicada con sus horas tal cual (6 decimales)', async () => {
    const { cliente, tablas } = clienteFalso({
      plantillas_tarjeta: ok([filaBorrador, filaPublicada]),
      formulas: ok([filaFormula]),
      tonos: ok(FILAS_DE_TONOS),
    })
    const r = await leerPlantillaSobre(cliente, ORIGEN)
    if (!r.ok) throw new Error(r.error.mensaje)
    expect([...tablas].sort()).toEqual(['formulas', 'plantillas_tarjeta', 'tonos'])
    expect(r.data.borrador?.actualizadoEn).toBe(HORA)
    expect(r.data.borrador?.plantilla).toEqual(PLANTILLA)
    expect(r.data.publicada).toMatchObject({
      id: PUBLICADA,
      version: 2,
      nota: 'Primera',
      publicadoEn: '2026-11-06T10:00:00.5+00:00',
    })
    expect(r.data.formula).toEqual({ id: FORMULA, version: 4 })
    expect(r.data.contexto?.tonos).toEqual(['verde', 'azul'])
    expect(r.data.contexto?.visibilidad).toEqual({ flete: { ver: 'todos' } })
    expect(r.data.tonos).toEqual(TONOS)
  })
})

describe('leerPlantillaSobre: lo que no se esperaba', () => {
  it('lo que la policy no deja ver vuelve vacío: sin plantillas ni fórmula, y los tonos siguen', async () => {
    const { cliente } = clienteFalso({ tonos: ok(FILAS_DE_TONOS) })
    const r = await leerPlantillaSobre(cliente, ORIGEN)
    expect(r).toEqual({
      ok: true,
      data: { publicada: null, borrador: null, formula: null, contexto: null, tonos: TONOS },
    })
  })

  it('dos del mismo estado, o un estado ajeno, son «inesperado»', async () => {
    for (const filas of [
      [filaBorrador, { ...filaBorrador, id: PUBLICADA }],
      [{ ...filaBorrador, estado: 'archivada' }],
      [{ ...filaBorrador, extra: 1 }],
    ]) {
      const { cliente } = clienteFalso({ plantillas_tarjeta: ok(filas) })
      const r = await leerPlantillaSobre(cliente, ORIGEN)
      expect(r).toEqual({
        ok: false,
        error: { codigo: 'inesperado', mensaje: 'No pudimos leer la plantilla.' },
      })
    }
  })

  it('una fórmula sin lo que mira el validador es «inesperado»', async () => {
    const { cliente } = clienteFalso({
      formulas: ok([{ ...filaFormula, definicion: { nodos: 'no' } }]),
    })
    const r = await leerPlantillaSobre(cliente, ORIGEN)
    expect(r).toEqual({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'No pudimos leer la fórmula.' },
    })
  })

  it('una definición de plantilla rota no tumba la lectura: llega con su motivo', async () => {
    const { cliente } = clienteFalso({
      plantillas_tarjeta: ok([{ ...filaBorrador, definicion: { grupos: 3 } }]),
    })
    const r = await leerPlantillaSobre(cliente, ORIGEN)
    if (!r.ok) throw new Error(r.error.mensaje)
    expect(r.data.borrador).toMatchObject({
      plantilla: null,
      motivo: 'La plantilla no tiene la forma esperada.',
    })
  })

  it('el error de una lectura es el de la primera que falló', async () => {
    const { cliente } = clienteFalso({
      plantillas_tarjeta: { data: null, error: { code: '42501', message: 'sin permiso' } },
      formulas: { data: null, error: { code: 'PT409', message: 'otro' } },
    })
    const r = await leerPlantillaSobre(cliente, ORIGEN)
    expect(r).toEqual({ ok: false, error: { codigo: 'sin_permiso', mensaje: 'sin permiso' } })
  })
})
