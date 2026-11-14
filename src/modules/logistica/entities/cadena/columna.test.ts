import { describe, expect, it } from 'vitest'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import {
  agregarTarjetas,
  claveDeColumna,
  columnaElegida,
  CLAVE_DE_SIN_FASE,
  cursorDeLaColumna,
  enElTope,
  numeroDeLaColumna,
  puedeVerMas,
} from './columna'
import type { ColumnaDeLaCadena, TarjetaDeLaCadena } from './leer'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const tarjeta = (n: number, extra: Partial<TarjetaDeLaCadena> = {}): TarjetaDeLaCadena => ({
  id: id(n),
  nombre: `V${String(n)}`,
  titulo: `V${String(n)}`,
  vin: null,
  lote: null,
  faseDesde: `2026-11-01T10:${String(n % 60).padStart(2, '0')}:00+00:00`,
  situacion: 'fase',
  demorada: false,
  contenedor: null,
  booking: null,
  etaEl: null,
  ...extra,
})
const columna = (
  n: number,
  hayMas: boolean,
  faseId: string | null = id(900),
): ColumnaDeLaCadena => ({
  faseId,
  nombre: 'Fase',
  color: null,
  activa: true,
  esFinal: false,
  demoraDias: null,
  tarjetas: Array.from({ length: n }, (_, i) => tarjeta(i + 1)),
  hayMas,
})

describe('puedeVerMas', () => {
  it('con más en la base y bajo el tope, sí', () => {
    expect(puedeVerMas(columna(50, true))).toBe(true)
  })
  it('sin más en la base, no', () => {
    expect(puedeVerMas(columna(50, false))).toBe(false)
  })
  it('en el tope, no: se avisa en vez de seguir', () => {
    const llena = columna(TOPE_DE_LO_CARGADO, true)
    expect(puedeVerMas(llena)).toBe(false)
    expect(enElTope(llena)).toBe(true)
    expect(enElTope(columna(TOPE_DE_LO_CARGADO, false))).toBe(false)
  })
})

describe('numeroDeLaColumna', () => {
  it('es lo cargado y un «+» si hay más: nunca un total', () => {
    expect(numeroDeLaColumna(columna(12, false))).toBe('12')
    expect(numeroDeLaColumna(columna(50, true))).toBe('50+')
    expect(numeroDeLaColumna(columna(0, false))).toBe('0')
  })
})

describe('agregarTarjetas', () => {
  it('suma las nuevas sin repetir las que ya estaban', () => {
    const base = columna(3, true)
    const resultado = agregarTarjetas(base, [tarjeta(3), tarjeta(4), tarjeta(5)], false)
    expect(resultado.tarjetas.map((t) => t.id)).toEqual([1, 2, 3, 4, 5].map(id))
    expect(resultado.hayMas).toBe(false)
  })
  it('no pasa del tope aunque la base entregue de más', () => {
    const base = columna(TOPE_DE_LO_CARGADO - 1, true)
    const resultado = agregarTarjetas(base, [tarjeta(9001), tarjeta(9002)], true)
    expect(resultado.tarjetas).toHaveLength(TOPE_DE_LO_CARGADO)
  })
  it('no toca la columna original', () => {
    const base = columna(2, true)
    agregarTarjetas(base, [tarjeta(7)], false)
    expect(base.tarjetas).toHaveLength(2)
  })
})

describe('cursorDeLaColumna', () => {
  it('en una fase es (fase_desde, id) de la última tarjeta cargada', () => {
    const c = columna(3, true)
    expect(cursorDeLaColumna(c)).toEqual({ desde: c.tarjetas[2]?.faseDesde, id: id(3) })
  })
  it('«Sin fase» no tiene fecha: el cursor va sólo por id', () => {
    const c = columna(3, true, null)
    expect(cursorDeLaColumna(c)).toEqual({ desde: null, id: id(3) })
  })
  it('sin tarjetas, o sin fecha en una fase, no hay cursor', () => {
    expect(cursorDeLaColumna(columna(0, false))).toBeNull()
    expect(
      cursorDeLaColumna({ faseId: id(1), tarjetas: [tarjeta(1, { faseDesde: null })] }),
    ).toBeNull()
  })
})

describe('claveDeColumna y columnaElegida', () => {
  it('«Sin fase» usa su clave; las demás, su id', () => {
    expect(claveDeColumna(null)).toBe(CLAVE_DE_SIN_FASE)
    expect(claveDeColumna(id(5))).toBe(id(5))
  })
  it('elige la pedida; una ajena cae en la primera; sin columnas, nula', () => {
    const cs = [columna(1, false, null), columna(1, false, id(2))]
    expect(columnaElegida(cs, id(2))?.faseId).toBe(id(2))
    expect(columnaElegida(cs, 'sin_fase')?.faseId).toBeNull()
    expect(columnaElegida(cs, 'ajena')?.faseId).toBeNull()
    expect(columnaElegida(cs, undefined)?.faseId).toBeNull()
    expect(columnaElegida([], 'x')).toBeNull()
  })
})
