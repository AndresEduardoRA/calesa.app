import { describe, expect, it } from 'vitest'
import {
  MAXIMO_DE_FOTOS,
  destinoDeMovimiento,
  esRutaDeFoto,
  fotoEliminadaDesde,
  fotosDesde,
  lugarPara,
} from './foto'

const VEHICULO = '00000000-0000-0000-0000-000000000001'
const fila = (orden: number, portada = false) => ({
  id: `00000000-0000-0000-0000-0000000000${String(orden).padStart(2, '0')}`,
  hash: String(orden).padStart(64, '0'),
  ruta: `${VEHICULO}/${'a'.repeat(64)}.webp`,
  ruta_miniatura: `${VEHICULO}/${'b'.repeat(64)}.webp`,
  ancho: 1600,
  alto: 1200,
  bytes: 300_000,
  orden,
  es_portada: portada,
})

describe('fotosDesde', () => {
  it('las devuelve en su orden, venga como venga la consulta', () => {
    const fotos = fotosDesde([fila(3), fila(1, true), fila(2)])
    expect(fotos.map((foto) => foto.orden)).toEqual([1, 2, 3])
    expect(fotos[0]).toMatchObject({ esPortada: true, rutaMiniatura: fila(1).ruta_miniatura })
  })

  it('una fila incompleta se rechaza', () => {
    expect(() => fotosDesde([{ ...fila(1), ruta_miniatura: null }])).toThrow()
  })
})

describe('fotoEliminadaDesde', () => {
  it('trae la foto como estaba, con su lugar y si era portada', () => {
    expect(fotoEliminadaDesde(fila(3, true))).toMatchObject({ orden: 3, esPortada: true })
  })

  it('null cuando ya no estaba (un reintento)', () => {
    expect(fotoEliminadaDesde(null)).toBeNull()
  })
})

describe('lugarPara', () => {
  it('lo que falta para el tope, nunca menos que cero', () => {
    expect(lugarPara([])).toBe(MAXIMO_DE_FOTOS)
    expect(lugarPara(Array.from({ length: 22 }))).toBe(2)
    expect(lugarPara(Array.from({ length: 30 }))).toBe(0)
  })
})

describe('destinoDeMovimiento', () => {
  const fotos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('un lugar antes es «después de la que está dos antes», o primera', () => {
    expect(destinoDeMovimiento(fotos, 'c', 'antes')).toEqual({ despuesDe: 'a' })
    expect(destinoDeMovimiento(fotos, 'b', 'antes')).toEqual({ despuesDe: null })
  })

  it('un lugar después es «después de la siguiente»', () => {
    expect(destinoDeMovimiento(fotos, 'a', 'despues')).toEqual({ despuesDe: 'b' })
  })

  it('en los bordes no hay a dónde', () => {
    expect(destinoDeMovimiento(fotos, 'a', 'antes')).toBeNull()
    expect(destinoDeMovimiento(fotos, 'c', 'despues')).toBeNull()
    expect(destinoDeMovimiento(fotos, 'no-esta', 'antes')).toBeNull()
  })
})

describe('esRutaDeFoto', () => {
  it('sólo la carpeta del vehículo, con nombre por hash y en WebP o JPEG', () => {
    expect(esRutaDeFoto(VEHICULO, `${VEHICULO}/${'a'.repeat(64)}.webp`)).toBe(true)
    expect(esRutaDeFoto(VEHICULO, `${VEHICULO}/${'a'.repeat(64)}.jpg`)).toBe(true)
  })

  it('rechaza la carpeta de otro vehículo, otra extensión y cualquier subcarpeta', () => {
    const otro = '00000000-0000-0000-0000-000000000002'
    expect(esRutaDeFoto(VEHICULO, `${otro}/${'a'.repeat(64)}.webp`)).toBe(false)
    expect(esRutaDeFoto(VEHICULO, `${VEHICULO}/${'a'.repeat(64)}.png`)).toBe(false)
    expect(esRutaDeFoto(VEHICULO, `${VEHICULO}/x/${'a'.repeat(64)}.webp`)).toBe(false)
    expect(esRutaDeFoto(VEHICULO, `${VEHICULO}/foto.webp`)).toBe(false)
  })
})
