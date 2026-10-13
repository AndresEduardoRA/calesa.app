import { describe, expect, it } from 'vitest'
import { esquemaAgregarFotos, esquemaMoverFoto, esquemaRestaurarFoto } from './fotos'

const VEHICULO = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const foto = (carpeta = VEHICULO) => ({
  hash: '0'.repeat(64),
  ruta: `${carpeta}/${'a'.repeat(64)}.webp`,
  rutaMiniatura: `${carpeta}/${'b'.repeat(64)}.jpg`,
  ancho: 1600,
  alto: 1200,
  bytes: 300_000,
})

describe('esquemaAgregarFotos', () => {
  it('acepta fotos de la carpeta del vehículo', () => {
    expect(esquemaAgregarFotos.safeParse({ vehiculoId: VEHICULO, fotos: [foto()] }).success).toBe(
      true,
    )
  })

  it('rechaza una ruta de la carpeta de otro vehículo', () => {
    expect(
      esquemaAgregarFotos.safeParse({ vehiculoId: VEHICULO, fotos: [foto(OTRO)] }).success,
    ).toBe(false)
  })

  it('ni vacío ni más de 24', () => {
    expect(esquemaAgregarFotos.safeParse({ vehiculoId: VEHICULO, fotos: [] }).success).toBe(false)
    const muchas = Array.from({ length: 25 }, () => foto())
    expect(esquemaAgregarFotos.safeParse({ vehiculoId: VEHICULO, fotos: muchas }).success).toBe(
      false,
    )
  })

  it('rechaza un hash que no lo es', () => {
    const mala = { ...foto(), hash: 'no-es-un-hash' }
    expect(esquemaAgregarFotos.safeParse({ vehiculoId: VEHICULO, fotos: [mala] }).success).toBe(
      false,
    )
  })
})

describe('esquemaRestaurarFoto', () => {
  it('pide el lugar y si era portada', () => {
    const base = { vehiculoId: VEHICULO, foto: foto() }
    expect(esquemaRestaurarFoto.safeParse(base).success).toBe(false)
    expect(
      esquemaRestaurarFoto.safeParse({
        vehiculoId: VEHICULO,
        foto: { ...foto(), orden: 2, esPortada: true },
      }).success,
    ).toBe(true)
  })
})

describe('esquemaMoverFoto', () => {
  it('«después de» puede ser nulo (primera), pero la versión no', () => {
    const base = { vehiculoId: VEHICULO, fotoId: OTRO, despuesDe: null }
    expect(esquemaMoverFoto.safeParse({ ...base, actualizadoEnEsperado: 'v1' }).success).toBe(true)
    expect(esquemaMoverFoto.safeParse({ ...base, actualizadoEnEsperado: '' }).success).toBe(false)
  })
})
