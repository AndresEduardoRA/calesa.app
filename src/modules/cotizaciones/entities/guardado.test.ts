import { describe, expect, it } from 'vitest'
import { MENSAJE_SESION_VENCIDA } from '@/shared/lib/errores'
import {
  resultadoDeCrear,
  textoDelFallo,
  textoDelRechazo,
  type ErrorDeCrear,
  type MotivoDeRechazo,
} from './guardado'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const MARCA = 'MENSAJE-DE-LA-BASE-qz'
const error = (code: string, details: string | null = null, hint: string | null = null) =>
  ({ code, details, hint, message: MARCA }) satisfies ErrorDeCrear
const motivo = (e: ErrorDeCrear) => {
  const r = resultadoDeCrear({ data: null, error: e })
  return r.tipo === 'rechazo' ? r.motivo : r.tipo
}

describe('resultadoDeCrear', () => {
  it('una respuesta que pasa el Zod es lo guardado, con su número, su total y si era un repetido', () => {
    const data = { cotizacion: { id: ID, numero: 41 }, totales: { usd: 1234.5 }, repetido: true }
    expect(resultadoDeCrear({ data, error: null })).toEqual({
      tipo: 'guardada',
      cotizacion: { id: ID, numero: 41, totalUsd: 1234.5, repetido: true },
    })
  })

  it('sin error y sin la forma prometida es una respuesta perdida, no un rechazo', () => {
    expect(resultadoDeCrear({ data: { cotizacion: {} }, error: null })).toEqual({ tipo: 'perdida' })
    expect(resultadoDeCrear({ data: null, error: null })).toEqual({ tipo: 'perdida' })
  })

  it('un error sin código (el transporte entre Next y la base) es una respuesta perdida', () => {
    expect(motivo({ message: 'TypeError: fetch failed' })).toBe('perdida')
    expect(motivo({ code: '', message: 'fetch failed' })).toBe('perdida')
  })

  const filas: [string, ErrorDeCrear, MotivoDeRechazo][] = [
    ['D2 por fórmula', error('PT409', 'desactualizada', 'formula'), 'desactualizada_formula'],
    [
      'D2 por tipo de cambio',
      error('PT409', 'desactualizada', 'tipo_cambio'),
      'desactualizada_tipo_cambio',
    ],
    ['PT409 sin detalle', error('PT409'), 'conflicto'],
    ['abierta vencida', error('22023', 'abierta_vencida', 'abierta'), 'recargar_hoja'],
    ['abierta inválida', error('22023', 'abierta_invalida', 'abierta'), 'recargar_hoja'],
    ['abierta no disponible', error('22023', 'abierta_no_disponible', 'abierta'), 'recargar_hoja'],
    ['falta la abierta', error('22023', null, 'abierta'), 'recargar_hoja'],
    ['nodo inexistente', error('22023', 'nodo_inexistente', 'pub'), 'recargar_hoja'],
    ['nodo no editable', error('42501', 'nodo_no_editable', 'pub'), 'recargar_hoja'],
    ['entrada inválida', error('22023', 'entrada_invalida', 'pub'), 'recargar_hoja'],
    ['origen sin fórmula', error('22023', 'origen_sin_formula'), 'sin_formula'],
    ['total sin valor', error('22023', 'total_sin_valor', 'total'), 'sin_total'],
    ['total fuera de rango', error('22023', 'fuera_de_rango', 'total'), 'total_fuera_de_rango'],
    ['moneda no soportada', error('22023', null, 'total'), 'moneda_no_soportada'],
    ['override no sobrescribible', error('22023', 'no_sobrescribible', 'pub'), 'valor_descartado'],
    ['override fuera de variante', error('22023', 'fuera_de_variante', 'pub'), 'valor_descartado'],
    [
      'override con condición apagada',
      error('22023', 'condicion_apagada', 'dep'),
      'valor_descartado',
    ],
    ['variante oculta sin defecto', error('22023', 'variante_sin_eleccion'), 'variante_oculta'],
    ['falta el lead', error('22023', null, 'lead'), 'falta_lead'],
    ['falta el vehículo', error('22023', null, 'vehiculo'), 'falta_vehiculo'],
    ['sesión vencida', error('PGRST301'), 'sesion'],
    ['clave que firma', error('XX000'), 'transitorio'],
    ['tiempo agotado', error('57014'), 'transitorio'],
    ['bloqueo mutuo', error('40P01'), 'transitorio'],
    ['candado ocupado', error('55P03'), 'transitorio'],
    ['PostgREST sin base', error('PGRST000'), 'transitorio'],
    ['PostgREST sin conexión', error('PGRST003'), 'transitorio'],
    ['entradas inválidas', error('22023', 'entradas_invalidas'), 'otro'],
    ['llamada inválida', error('22023', 'llamada_invalida'), 'otro'],
    ['fórmula sin validar', error('22023', 'formula_sin_validar'), 'otro'],
    ['vehículo de otro origen', error('22023', 'vehiculo_de_otro_origen', 'p_vehiculo'), 'otro'],
    ['22023 sin detalle ni pista', error('22023'), 'otro'],
    ['la final duplicada', error('23505', null, 'vehiculo'), 'otro'],
    ['un código desconocido', error('P0001'), 'otro'],
  ]
  it.each(filas)('%s', (_, e, esperado) => {
    expect(motivo(e)).toBe(esperado)
  })

  // Los orígenes del 42501 sin detalle (`…009000:400-402,427,431,538`, `_cotizacion_vehiculo`, `assert_activo`): todos dicen lo mismo y no confirman qué existe.
  it.each([
    'Necesitas el permiso cotizaciones.crear.',
    'Tu cuenta está bloqueada o dada de baja.',
    'No encontramos este lead o no tienes acceso.',
    'No tienes acceso a este vehículo.',
    'No tienes acceso a esta cotización.',
  ])('42501 sin detalle: «%s» es sin_acceso', (mensaje) => {
    expect(motivo({ code: '42501', message: mensaje })).toBe('sin_acceso')
  })
})

const MOTIVOS: MotivoDeRechazo[] = [
  'desactualizada_formula',
  'desactualizada_tipo_cambio',
  'conflicto',
  'recargar_hoja',
  'sin_formula',
  'sin_total',
  'total_fuera_de_rango',
  'moneda_no_soportada',
  'valor_descartado',
  'variante_oculta',
  'falta_lead',
  'falta_vehiculo',
  'sin_acceso',
  'sesion',
  'transitorio',
  'otro',
]

describe('textoDelRechazo', () => {
  it('cada motivo tiene su salida: un botón que no arregla nada no se ofrece', () => {
    const salidas = Object.fromEntries(MOTIVOS.map((m) => [m, textoDelRechazo(m).salida]))
    expect(salidas).toEqual({
      desactualizada_formula: 'd2',
      desactualizada_tipo_cambio: 'd2',
      conflicto: 'reintentar',
      recargar_hoja: 'recargar',
      sin_formula: 'recargar',
      sin_total: null,
      total_fuera_de_rango: null,
      moneda_no_soportada: null,
      valor_descartado: null,
      variante_oculta: null,
      falta_lead: null,
      falta_vehiculo: null,
      sin_acceso: 'recargar',
      sesion: 'ingresar',
      transitorio: 'reintentar',
      otro: null,
    })
  })

  it('ningún texto es el mensaje de la base, ni nombra un nodo', () => {
    for (const m of MOTIVOS) {
      const { texto } = textoDelRechazo(m)
      expect(texto).not.toContain(MARCA)
      expect(texto).not.toMatch(/\b(pub|dep)\b/)
      expect(texto.length).toBeGreaterThan(10)
    }
  })

  it('la sesión vencida usa el texto de siempre', () => {
    expect(textoDelRechazo('sesion').texto).toBe(MENSAJE_SESION_VENCIDA)
  })

  it('la variante oculta pide avisar a quien configura, y todo el 42501 dice lo mismo', () => {
    expect(textoDelRechazo('variante_oculta').texto).toMatch(/quien configura el cotizador/)
    expect(textoDelRechazo('sin_acceso').texto).toMatch(/lo que estás cotizando/)
  })
})

describe('textoDelFallo', () => {
  it('sin red reintenta, la validación recarga, la sesión vencida ingresa y lo inesperado reintenta', () => {
    expect(
      textoDelFallo({ ok: false, sinRed: true, error: { codigo: 'inesperado', mensaje: MARCA } }),
    ).toEqual({ texto: expect.stringMatching(/No pudimos llegar/), salida: 'reintentar' })
    expect(
      textoDelFallo({ ok: false, error: { codigo: 'validacion', mensaje: MARCA } }).salida,
    ).toBe('recargar')
    expect(
      textoDelFallo({ ok: false, error: { codigo: 'no_autenticado', mensaje: MARCA } }),
    ).toEqual({
      texto: MENSAJE_SESION_VENCIDA,
      salida: 'ingresar',
    })
    const inesperado = textoDelFallo({ ok: false, error: { codigo: 'inesperado', mensaje: MARCA } })
    expect(inesperado.salida).toBe('reintentar')
    expect(inesperado.texto).not.toContain(MARCA)
  })
})
