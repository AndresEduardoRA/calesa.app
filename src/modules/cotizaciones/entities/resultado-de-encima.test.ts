import { describe, expect, it } from 'vitest'
import {
  avisoDeCreada,
  resultadoDeEncima,
  textoDeEncima,
  type ResultadoDeEncima,
} from './resultado-de-encima'

const ID = '00000000-0000-4000-8000-0000000000aa'
const NUEVA = '00000000-0000-4000-8000-0000000000cc'
const rechazo = (code: string | null, extra: Record<string, string> = {}) =>
  resultadoDeEncima({ data: null, error: { code, message: 'texto de la base', ...extra } })

describe('resultadoDeEncima: lo que vuelve de cotizacion_encima()', () => {
  it('la respuesta: la nueva con su número, su versión y lo descartado', () => {
    const r = resultadoDeEncima({
      data: { cotizacion: { id: NUEVA, numero: 42, version: 2 }, repetido: false, descartados: 3 },
      error: null,
    })
    expect(r).toEqual({ tipo: 'creada', id: NUEVA, numero: 42, version: 2, descartados: 3 })
  })

  it('un intento repetido llega sin «descartados»: son 0', () => {
    const r = resultadoDeEncima({
      data: { cotizacion: { id: NUEVA, numero: 42, version: 2 }, repetido: true },
      error: null,
    })
    expect(r).toMatchObject({ tipo: 'creada', descartados: 0 })
  })

  it('una respuesta que no se puede leer es una pérdida', () => {
    expect(resultadoDeEncima({ data: { raro: 1 }, error: null })).toEqual({ tipo: 'perdida' })
    expect(rechazo(null)).toEqual({ tipo: 'perdida' })
    expect(rechazo(undefined as unknown as null)).toEqual({ tipo: 'perdida' })
  })

  it('PT409 ya_tiene_encima: con el id de la nueva si la ve, sin él si no', () => {
    expect(rechazo('PT409', { details: 'ya_tiene_encima', hint: NUEVA })).toEqual({
      tipo: 'ya_tiene',
      id: NUEVA,
    })
    expect(rechazo('PT409', { details: 'ya_tiene_encima' })).toEqual({ tipo: 'ya_tiene', id: null })
    expect(rechazo('PT409', { details: 'ya_tiene_encima', hint: 'no es un id' })).toEqual({
      tipo: 'ya_tiene',
      id: null,
    })
  })

  it('PT409 sin detalle: la fórmula cambió, se reintenta', () => {
    expect(rechazo('PT409')).toEqual({ tipo: 'reintentar' })
  })

  it('22023: intento reusado, lead o vehículo que cambió → recargar', () => {
    expect(rechazo('22023', { details: 'intento_reusado', hint: 'intento' })).toEqual({
      tipo: 'recargar',
    })
    expect(rechazo('22023', { hint: 'lead' })).toEqual({ tipo: 'recargar' })
    expect(rechazo('22023', { hint: 'vehiculo' })).toEqual({ tipo: 'recargar' })
  })

  it('22023: origen sin fórmula; sin valor para el total, fuera de rango o moneda → sin total', () => {
    expect(rechazo('22023', { details: 'origen_sin_formula' })).toEqual({ tipo: 'sin_formula' })
    expect(rechazo('22023', { details: 'total_sin_valor', hint: 'total' })).toEqual({
      tipo: 'sin_total',
    })
    expect(rechazo('22023', { details: 'fuera_de_rango', hint: 'total' })).toEqual({
      tipo: 'sin_total',
    })
    expect(rechazo('22023', { hint: 'total' })).toEqual({ tipo: 'sin_total' })
  })

  it('42501 es perder el acceso; lo demás es «otro»', () => {
    expect(rechazo('42501')).toEqual({ tipo: 'sin_acceso' })
    expect(rechazo('P0001')).toEqual({ tipo: 'otro' })
    expect(rechazo('22023')).toEqual({ tipo: 'otro' })
    expect(rechazo('PT409', { details: 'otra_cosa' })).toEqual({ tipo: 'otro' })
  })
})

describe('textoDeEncima: lo que dice el aviso (ningún texto de la base)', () => {
  const texto = (r: ResultadoDeEncima) => textoDeEncima(r)
  it('cada resultado tiene su texto, y el de una creada no tiene (va a un aviso efímero)', () => {
    expect(texto({ tipo: 'ya_tiene', id: ID })).toBe('Esta cotización ya tiene una versión nueva.')
    expect(texto({ tipo: 'ya_tiene', id: null })).toBe(
      'Esta cotización ya tiene una versión nueva que no puedes ver.',
    )
    expect(texto({ tipo: 'reintentar' })).toBe(
      'La fórmula cambió mientras cotizabas. Vuelve a intentar.',
    )
    expect(texto({ tipo: 'recargar' })).toBe('Esta cotización cambió: recárgala.')
    expect(texto({ tipo: 'sin_formula' })).toBe('Este origen ya no tiene una fórmula publicada.')
    expect(texto({ tipo: 'sin_total' })).toBe(
      'La versión de hoy no da un total con lo que tenía esta cotización: cotiza una nueva.',
    )
    expect(texto({ tipo: 'sin_acceso' })).toBe('Ya no puedes cotizar encima de esta cotización.')
    expect(texto({ tipo: 'perdida' })).toBe(
      'No se pudo cotizar encima. Revisa tu conexión y vuelve a intentar.',
    )
    expect(texto({ tipo: 'otro' })).toBe('No se pudo cotizar encima.')
    expect(texto({ tipo: 'creada', id: NUEVA, numero: 42, version: 2, descartados: 0 })).toBeNull()
  })
})

describe('avisoDeCreada: el aviso efímero de la nueva versión', () => {
  const creada = (descartados: number) => ({
    tipo: 'creada' as const,
    id: NUEVA,
    numero: 42,
    version: 2,
    descartados,
  })
  it('dice la versión y el número; lo descartado, en singular y en plural', () => {
    expect(avisoDeCreada(creada(0))).toBe('Versión 2 creada (n.º 42).')
    expect(avisoDeCreada(creada(1))).toBe(
      'Versión 2 creada (n.º 42). 1 dato que tipeaste no sigue en la versión de hoy.',
    )
    expect(avisoDeCreada(creada(4))).toBe(
      'Versión 2 creada (n.º 42). 4 datos que tipeaste no siguen en la versión de hoy.',
    )
  })
})
