import { describe, expect, it } from 'vitest'
import { columnasDe, fasesDesde, tarjetasDesde, type FaseDeLaCadena } from './cadena-filas'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const fase = (n: number, extra: Partial<FaseDeLaCadena> = {}): FaseDeLaCadena => ({
  id: guid(n),
  nombre: `Fase ${String(n)}`,
  color: '#000000',
  activa: true,
  esFinal: false,
  ...extra,
})
const vacia = { tarjetas: [], hayMas: false }

describe('las tarjetas de la base', () => {
  const fila = {
    id: guid(1),
    descripcion: 'Pastillas',
    cantidad: 2,
    fase_desde: '2026-11-01T10:00:00+00:00',
    proyecto: { id: guid(9), numero: 4, vehiculo_etiqueta: 'Hilux de prueba' },
  }

  it('las arma con su proyecto', () => {
    const r = tarjetasDesde([fila])
    expect(r.ok && r.data[0]).toEqual({
      id: guid(1),
      descripcion: 'Pastillas',
      cantidad: 2,
      faseDesde: '2026-11-01T10:00:00+00:00',
      proyecto: { id: guid(9), numero: 4, etiqueta: 'Hilux de prueba' },
    })
  })

  it('una fila sin proyecto es un error, no una tarjeta a medias', () => {
    expect(tarjetasDesde([{ ...fila, proyecto: null }]).ok).toBe(false)
  })
})

describe('las fases de la base', () => {
  it('más de 30 es un error visible, nunca un corte en silencio', () => {
    const fila = (n: number) => ({
      id: guid(n),
      nombre: 'F',
      color: '#fff',
      activa: true,
      es_final: false,
    })
    expect(fasesDesde(Array.from({ length: 30 }, (_, i) => fila(i + 1))).ok).toBe(true)
    expect(fasesDesde(Array.from({ length: 31 }, (_, i) => fila(i + 1))).ok).toBe(false)
  })
})

describe('las columnas', () => {
  const unaTarjeta = {
    id: guid(50),
    descripcion: 'x',
    cantidad: 1,
    faseDesde: null,
    proyecto: { id: guid(9), numero: 1, etiqueta: null },
  }

  it('«Sin fase» sólo si tiene ítems, y primera', () => {
    const sin = columnasDe([fase(1)], { sinFase: vacia, porFase: new Map() })
    expect(sin.map((c) => c.faseId)).toEqual([guid(1)])
    const con = columnasDe([fase(1)], {
      sinFase: { tarjetas: [unaTarjeta], hayMas: false },
      porFase: new Map(),
    })
    expect(con.map((c) => c.faseId)).toEqual([null, guid(1)])
  })

  it('descarta una fase jubilada sin ítems y deja las vacías activas', () => {
    const columnas = columnasDe([fase(1), fase(2, { activa: false }), fase(3)], {
      sinFase: vacia,
      porFase: new Map(),
    })
    expect(columnas.map((c) => c.faseId)).toEqual([guid(1), guid(3)])
  })

  it('conserva una fase jubilada que aún tiene ítems', () => {
    const columnas = columnasDe([fase(2, { activa: false })], {
      sinFase: vacia,
      porFase: new Map([[guid(2), { tarjetas: [unaTarjeta], hayMas: false }]]),
    })
    expect(columnas[0]?.activa).toBe(false)
  })
})
