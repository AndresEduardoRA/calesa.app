import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fotosPorTraerDe, subastaDesdeFila } from './subasta-vehiculo'

const COPART = (
  JSON.parse(readFileSync(join(process.cwd(), 'e2e/fixtures/apibara/copart.json'), 'utf8')) as {
    data: Record<string, unknown>
  }
).data

const fila = {
  subasta_en: '2026-10-14T18:00:00+00:00',
  subasta_fin_en: null,
  estado_subasta: 'abierta',
  apibara_sync_en: '2026-10-14T15:00:00+00:00',
  apibara_raw: COPART,
  vehiculos_imagenes: [{ origen_url: 'https://cs.copart.com/a.jpg' }, { origen_url: null }],
}

describe('subastaDesdeFila', () => {
  it('lee la fecha, el estado, lo que se muestra del bruto y las fotos que vinieron de apibara', () => {
    expect(subastaDesdeFila(fila)).toMatchObject({
      subastaEn: '2026-10-14T18:00:00+00:00',
      estado: 'abierta',
      sincronizadoEn: '2026-10-14T15:00:00+00:00',
      pujaActual: 2500,
      compraInmediata: null,
      precioDeVenta: null,
      fotosRegistradas: ['https://cs.copart.com/a.jpg'],
    })
    expect(subastaDesdeFila(fila).raw).toEqual(COPART)
  })

  it('un vehículo cargado a mano no tiene nada de apibara', () => {
    expect(
      subastaDesdeFila({
        subasta_en: null,
        subasta_fin_en: null,
        estado_subasta: null,
        apibara_sync_en: null,
        apibara_raw: null,
        vehiculos_imagenes: [],
      }),
    ).toEqual({
      subastaEn: null,
      subastaFinEn: null,
      estado: null,
      sincronizadoEn: null,
      pujaActual: null,
      compraInmediata: null,
      precioDeVenta: null,
      fotosRegistradas: [],
      raw: null,
    })
  })

  it('un estado que no se conoce o un bruto que no es un objeto no tumban la lectura', () => {
    const leida = subastaDesdeFila({ ...fila, estado_subasta: 'SOLD', apibara_raw: [1, 2] })
    expect(leida.estado).toBeNull()
    expect(leida.raw).toBeNull()
    expect(leida.pujaActual).toBeNull()
  })
})

describe('fotosPorTraerDe', () => {
  it('son las de la respuesta que el vehículo todavía no tiene', () => {
    const todas = fotosPorTraerDe(subastaDesdeFila({ ...fila, vehiculos_imagenes: [] }))
    expect(todas).toHaveLength(14)
    const primera = todas[0]?.url ?? ''
    const faltan = fotosPorTraerDe(
      subastaDesdeFila({ ...fila, vehiculos_imagenes: [{ origen_url: primera }] }),
    )
    expect(faltan).toHaveLength(13)
    expect(faltan[0]?.orden).toBe(2)
  })

  it('sin respuesta guardada no hay nada que traer', () => {
    expect(fotosPorTraerDe(null)).toEqual([])
    expect(fotosPorTraerDe(subastaDesdeFila({ ...fila, apibara_raw: null }))).toEqual([])
  })
})
