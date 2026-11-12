import { describe, expect, it } from 'vitest'

import casos from './casos-del-cotizador.json'
import { filasDeCotizacionDesde } from './cotizacion'
import { cotizacionDesde, lineasDesde, lineasPorBloque } from './hoja-de-lectura'
import { leerSnapshot, type LecturaDelSnapshot } from './snapshot'

// La config A: factor 1,35, recargo 10 %, redondeo 1; tramos de 0 a 2000 (sin tramo desde 2000).
const valido: LecturaDelSnapshot = leerSnapshot(casos.configs.A)
const invalido: LecturaDelSnapshot = { ok: false }

const ENORME = '12345678901234.56'

const fila = (extra: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  numero: 7,
  estado: 'borrador',
  moneda: 'USD',
  total: ENORME,
  creado_en: '2026-11-12T10:00:00+00:00',
  aceptada_en: null,
  ...extra,
})

const linea = (extra: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-0000000000b1',
  item_id: null,
  descripcion: 'Filtro',
  bloque: 'importado',
  cantidad: 2,
  costo: '50.00',
  logistica_sugerida: '15.00',
  logistica: null,
  caja: '10.00',
  total: '133.00',
  orden: 0,
  ...extra,
})

describe('la lista de cotizaciones: el dinero queda como lo guardó la base', () => {
  it('un total de 16 cifras llega como el mismo texto, sin pasar por número', () => {
    const filas = filasDeCotizacionDesde([fila()])
    expect(filas?.[0]?.total).toBe(ENORME)
  })

  it('un total nulo queda nulo, nunca 0', () => {
    const filas = filasDeCotizacionDesde([fila({ total: null })])
    expect(filas?.[0]?.total).toBeNull()
  })

  it('una fila con un total que no es texto no se lee', () => {
    expect(filasDeCotizacionDesde([fila({ total: 12.5 })])).toBeNull()
  })
})

describe('la hoja en sólo lectura', () => {
  it('la cotización trae su snapshot leído y su total exacto', () => {
    const c = cotizacionDesde({
      ...fila({ total: null }),
      actualizado_en: '2026-11-12T10:00:00+00:00',
      notas: null,
      config_snapshot: casos.configs.A,
    })
    expect(c?.total).toBeNull()
    expect(c?.snapshot.ok).toBe(true)
    const vieja = cotizacionDesde({
      ...fila({ estado: 'anulada' }),
      actualizado_en: '2026-11-12T10:00:00+00:00',
      notas: null,
      config_snapshot: {},
    })
    expect(vieja?.snapshot.ok).toBe(false)
  })

  it('el total de la línea es el guardado aunque la fórmula diera otro: no se recalcula', () => {
    // Con la config A daría 133.00; la base guardó otro y es el que se muestra.
    const [l] = lineasDesde([linea({ total: ENORME })], valido) ?? []
    expect(l?.total).toBe(ENORME)
    expect(l?.falta).toBeNull()
  })
})

describe('la línea sin total y la logística', () => {
  it('sin total guardado, dice qué falta según la fórmula', () => {
    const lineas =
      lineasDesde(
        [
          linea({ id: '00000000-0000-4000-8000-0000000000c1', costo: null, total: null }),
          linea({
            id: '00000000-0000-4000-8000-0000000000c2',
            costo: '5000.00',
            logistica_sugerida: null,
            total: null,
          }),
          linea({ id: '00000000-0000-4000-8000-0000000000c3', caja: null, total: null }),
        ],
        valido,
      ) ?? []
    expect(lineas.map((l) => [l.total, l.falta])).toEqual([
      [null, 'costo'],
      [null, 'logistica'],
      [null, 'caja'],
    ])
  })

  it('sin snapshot válido, o si la fórmula sí daría total, lo que falta es desconocido', () => {
    const [sinSnapshot] = lineasDesde([linea({ costo: null, total: null })], invalido) ?? []
    expect(sinSnapshot?.falta).toBe('desconocida')
    // Todo está para calcular y la base no guardó total: no se inventa un motivo.
    const [noCoincide] = lineasDesde([linea({ total: null })], valido) ?? []
    expect(noCoincide?.falta).toBe('desconocida')
  })

  it('la logística nula muestra la sugerida y lo dice; una escrita, no', () => {
    const [sugerida, escrita] =
      lineasDesde(
        [
          linea(),
          linea({ id: '00000000-0000-4000-8000-0000000000b2', logistica: '20.00', orden: 1 }),
        ],
        valido,
      ) ?? []
    expect([sugerida?.logistica, sugerida?.esSugerida]).toEqual(['15.00', true])
    expect([escrita?.logistica, escrita?.esSugerida]).toEqual(['20.00', false])
  })

  it('las líneas se reparten por bloque en el orden de `orden`', () => {
    const lineas =
      lineasDesde(
        [
          linea({ id: '00000000-0000-4000-8000-0000000000d3', orden: 2, descripcion: 'C' }),
          linea({
            id: '00000000-0000-4000-8000-0000000000d1',
            orden: 0,
            descripcion: 'A',
            bloque: 'local',
          }),
          linea({ id: '00000000-0000-4000-8000-0000000000d2', orden: 1, descripcion: 'B' }),
        ],
        valido,
      ) ?? []
    const { importado, local } = lineasPorBloque(lineas)
    expect(importado.map((l) => l.descripcion)).toEqual(['B', 'C'])
    expect(local.map((l) => l.descripcion)).toEqual(['A'])
  })
})
