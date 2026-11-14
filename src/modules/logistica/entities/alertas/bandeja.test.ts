import { describe, expect, it } from 'vitest'
import { bandejaDesde, detalleDeDemorada, detalleDeTrabado } from './bandeja'

const ORIGEN = '0b7c1f9e-3a5d-4c2b-8e6f-1a2b3c4d5e6f'
const VEHICULO = '1c8d2e0f-4b6e-4d3c-9f70-2b3c4d5e6f70'
const DOCUMENTO = '2d9e3f10-5c7f-4e4d-8a81-3c4d5e6f7081'
const FASE = '3eaf4021-6d80-4f5e-9b92-4d5e6f708192'

const respuesta = {
  demoradas: {
    filas: [
      {
        id: VEHICULO,
        titulo: 'Hilux 2021',
        origen_id: ORIGEN,
        fase_id: FASE,
        fase: 'Tránsito',
        fase_desde: '2026-11-07T13:00:00+00:00',
        dias: 1,
        situacion: 'sin_resolver',
      },
    ],
    hay_mas: true,
  },
  trabados: {
    filas: [
      {
        id: VEHICULO,
        titulo: 'Hilux 2021',
        fase: 'Tránsito',
        fase_desde: '2026-11-07T13:00:00+00:00',
        fase_siguiente: 'Aduana',
        motivo: 'Documento: BL',
      },
    ],
    hay_mas: false,
  },
  por_aprobar: {
    filas: [
      {
        id: DOCUMENTO,
        vehiculo_id: VEHICULO,
        titulo: 'Hilux 2021',
        tipo: 'BL',
        creado_en: '2026-11-10T13:00:00+00:00',
      },
    ],
    hay_mas: false,
  },
}

describe('bandejaDesde', () => {
  it('pasa la respuesta de logistica_bandeja a camelCase, con hayMas', () => {
    const leida = bandejaDesde(respuesta)
    expect(leida.ok).toBe(true)
    if (!leida.ok) return
    expect(leida.data.demoradas.hayMas).toBe(true)
    expect(leida.data.demoradas.filas[0]).toEqual({
      id: VEHICULO,
      titulo: 'Hilux 2021',
      origenId: ORIGEN,
      fase: 'Tránsito',
      faseDesde: '2026-11-07T13:00:00+00:00',
      situacion: 'sin_resolver',
    })
    expect(leida.data.trabados.filas[0]?.faseSiguiente).toBe('Aduana')
    expect(leida.data.porAprobar.filas[0]?.vehiculoId).toBe(VEHICULO)
    expect(leida.data.porAprobar.hayMas).toBe(false)
  })

  it('una forma inesperada es un error, nunca una lista a medias', () => {
    const { por_aprobar: _sinPorAprobar, ...sinPorAprobar } = respuesta
    expect(bandejaDesde(sinPorAprobar).ok).toBe(false)
    const idMalo = {
      ...respuesta,
      demoradas: { filas: [{ ...respuesta.demoradas.filas[0], id: 'no-es-uuid' }], hay_mas: false },
    }
    expect(bandejaDesde(idMalo).ok).toBe(false)
    expect(bandejaDesde(null).ok).toBe(false)
  })
})

describe('los textos de las filas', () => {
  const ahora = new Date('2026-11-10T15:00:00Z')

  it('una demorada dice su fase y cuántos días lleva', () => {
    expect(detalleDeDemorada({ fase: 'Tránsito', faseDesde: '2026-11-07T13:00:00Z' }, ahora)).toBe(
      '«Tránsito» · Desde hace 3 días en esta fase',
    )
    expect(detalleDeDemorada({ fase: 'Tránsito', faseDesde: null }, ahora)).toBe('«Tránsito»')
  })

  it('una demorada en la subasta sin resolver lo dice; con su fase, no', () => {
    expect(
      detalleDeDemorada(
        { fase: 'Subasta', faseDesde: '2026-11-07T13:00:00Z', situacion: 'sin_resolver' },
        ahora,
      ),
    ).toBe('«Subasta» · Sin resolver · Desde hace 3 días en esta fase')
    expect(detalleDeDemorada({ fase: 'Tránsito', faseDesde: null, situacion: 'fase' }, ahora)).toBe(
      '«Tránsito»',
    )
  })

  it('un trabado dice qué le falta para la fase siguiente', () => {
    expect(detalleDeTrabado({ faseSiguiente: 'C', motivo: 'Documento: BL' })).toBe(
      'Falta para «C»: Documento: BL',
    )
  })
})
