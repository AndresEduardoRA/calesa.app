import { describe, expect, it } from 'vitest'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import {
  agregarTarjetas,
  claveDeColumna,
  columnaElegida,
  cursorDeLaColumna,
  enElTope,
  esVistaDeLaCadena,
  frasePorColumna,
  numeroDeLaColumna,
  ordenDeLaColumna,
  pedidoDeLaCadena,
  puedeVerMas,
  rutaDeLaCadena,
  textoDeLosDiasEnLaFase,
  type ColumnaDeRepuestos,
  type TarjetaDeRepuesto,
} from './cadena'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const tarjeta = (
  n: number,
  faseDesde: string | null = '2026-11-01T10:00:00+00:00',
): TarjetaDeRepuesto => ({
  id: guid(n),
  descripcion: `Pieza ${String(n)}`,
  cantidad: 1,
  faseDesde,
  proyecto: { id: guid(900), numero: 7, etiqueta: null },
})

const columna = (
  tarjetas: TarjetaDeRepuesto[],
  extra: Partial<ColumnaDeRepuestos> = {},
): ColumnaDeRepuestos => ({
  faseId: guid(100),
  nombre: 'En tránsito',
  color: '#2563eb',
  activa: true,
  esFinal: false,
  tarjetas,
  hayMas: false,
  ...extra,
})

const valores = (busqueda: string) => ({ busqueda, porClave: {} })

describe('la URL de la Cadena', () => {
  it('sólo `cadena` pide la vista', () => {
    expect(esVistaDeLaCadena('cadena')).toBe(true)
    expect(esVistaDeLaCadena('stock')).toBe(false)
    expect(esVistaDeLaCadena(null)).toBe(false)
  })

  it('ignora una búsqueda corta y un proyecto que no es guid', () => {
    expect(pedidoDeLaCadena(valores('ab'), 'no-es-guid')).toEqual({ q: null, proyecto: null })
    expect(pedidoDeLaCadena(valores('  freno  '), guid(5))).toEqual({
      q: 'freno',
      proyecto: guid(5),
    })
  })

  it('arma la ruta con el proyecto o la búsqueda, y sólo con un guid', () => {
    expect(rutaDeLaCadena()).toBe('/repuestos?vista=cadena')
    expect(rutaDeLaCadena({ proyecto: guid(5) })).toBe(
      `/repuestos?vista=cadena&proyecto=${guid(5)}`,
    )
    expect(rutaDeLaCadena({ proyecto: 'x', q: 'freno' })).toBe('/repuestos?vista=cadena&q=freno')
  })
})

describe('el orden de cada fase', () => {
  it('una fase final va de lo más reciente; las demás, de lo que lleva más tiempo', () => {
    expect(ordenDeLaColumna({ esFinal: true })).toBe('recientes')
    expect(ordenDeLaColumna({ esFinal: false })).toBe('antiguos')
  })
})

describe('el cursor de una columna', () => {
  it('es (fase_desde, id) de la última tarjeta en una fase', () => {
    const c = columna([tarjeta(1), tarjeta(2, '2026-11-02T10:00:00+00:00')])
    expect(cursorDeLaColumna(c)).toEqual({ desde: '2026-11-02T10:00:00+00:00', id: guid(2) })
  })

  it('en «Sin fase» va sólo por id', () => {
    expect(cursorDeLaColumna(columna([tarjeta(1, null)], { faseId: null }))).toEqual({
      desde: null,
      id: guid(1),
    })
  })

  it('sin fase_desde en una fase, o sin tarjetas, no hay cursor', () => {
    expect(cursorDeLaColumna(columna([tarjeta(1, null)]))).toBeNull()
    expect(cursorDeLaColumna(columna([]))).toBeNull()
  })
})

describe('agregar lo que llega', () => {
  it('no repite una tarjeta que ya estaba', () => {
    const c = agregarTarjetas(columna([tarjeta(1), tarjeta(2)]), [tarjeta(2), tarjeta(3)], true)
    expect(c.tarjetas.map((t) => t.id)).toEqual([guid(1), guid(2), guid(3)])
    expect(c.hayMas).toBe(true)
  })

  it('no pasa del tope de lo cargado', () => {
    const muchas = Array.from({ length: TOPE_DE_LO_CARGADO - 1 }, (_, i) => tarjeta(i + 1))
    const c = agregarTarjetas(columna(muchas), [tarjeta(9001), tarjeta(9002)], true)
    expect(c.tarjetas).toHaveLength(TOPE_DE_LO_CARGADO)
    expect(enElTope(c)).toBe(true)
    expect(puedeVerMas(c)).toBe(false)
  })
})

describe('el número de la columna', () => {
  it('«50+» con más y el número sin más; nunca un total', () => {
    const cincuenta = Array.from({ length: 50 }, (_, i) => tarjeta(i + 1))
    expect(numeroDeLaColumna(columna(cincuenta, { hayMas: true }))).toBe('50+')
    expect(numeroDeLaColumna(columna([tarjeta(1)]))).toBe('1')
    expect(frasePorColumna(columna(cincuenta, { hayMas: true }))).toBe('más de 50 ítems')
    expect(frasePorColumna(columna([tarjeta(1)]))).toBe('1 ítem')
  })
})

describe('la columna elegida', () => {
  const a = columna([], { faseId: guid(1) })
  const sin = columna([], { faseId: null })
  it('la de `?fase=`; si no existe, la primera; sin columnas, nulo', () => {
    expect(columnaElegida([sin, a], guid(1))).toBe(a)
    expect(columnaElegida([sin, a], 'sin_fase')).toBe(sin)
    expect(columnaElegida([sin, a], 'ajena')).toBe(sin)
    expect(columnaElegida([], null)).toBeNull()
    expect(claveDeColumna(null)).toBe('sin_fase')
  })
})

describe('los días en la fase', () => {
  const ahora = new Date('2026-11-12T15:00:00Z')
  it('dice hoy, 1 día y N días; nada sin fecha', () => {
    expect(textoDeLosDiasEnLaFase('2026-11-12T13:00:00Z', ahora)).toBe('Entró hoy')
    expect(textoDeLosDiasEnLaFase('2026-11-11T13:00:00Z', ahora)).toBe('1 día en la fase')
    expect(textoDeLosDiasEnLaFase('2026-11-09T13:00:00Z', ahora)).toBe('3 días en la fase')
    expect(textoDeLosDiasEnLaFase(null, ahora)).toBeNull()
  })
})
