import { describe, expect, it } from 'vitest'
import type { FotoPreparada } from '../../composicion.client'
import {
  contarBandeja,
  etiquetaDeSubir,
  paraSubir,
  reducirBandeja,
  verBandeja,
  type AccionDeBandeja,
  type ItemDeBandeja,
} from './bandeja'

const preparada = (hash: string): FotoPreparada => {
  const imagen = { contenido: new Blob(['x']), ancho: 10, alto: 10 }
  return { hash, completa: imagen, miniatura: imagen }
}
const aplicar = (acciones: AccionDeBandeja[], desde: ItemDeBandeja[] = []) =>
  acciones.reduce(reducirBandeja, desde)
const elegir = (...claves: string[]): AccionDeBandeja => ({
  tipo: 'elegidas',
  items: claves.map((clave) => ({ clave, nombre: `${clave}.jpg`, motivo: null })),
})
const leer = (clave: string, hash = clave): AccionDeBandeja => ({
  tipo: 'preparada',
  clave,
  preparada: preparada(hash),
  vista: `blob:${clave}`,
})

describe('reducirBandeja', () => {
  it('lo elegido entra leyéndose; lo que ya trae motivo, rechazado', () => {
    const bandeja = aplicar([
      { tipo: 'elegidas', items: [{ clave: 'a', nombre: 'a.pdf', motivo: 'No es una foto' }] },
      elegir('b'),
    ])
    expect(bandeja.map((item) => item.estado)).toEqual(['rechazada', 'preparando'])
  })

  it('una foto leída queda lista, con su vista previa', () => {
    const [item] = aplicar([elegir('a'), leer('a')])
    expect(item).toMatchObject({ estado: 'lista', vista: 'blob:a' })
  })

  it('la que falla conserva lo que ya subió: un reintento no la vuelve a subir', () => {
    const subida = { hash: 'a', ruta: 'r', rutaMiniatura: 'm', ancho: 1, alto: 1, bytes: 1 }
    const [item] = aplicar([
      elegir('a'),
      leer('a'),
      { tipo: 'subiendo', claves: ['a'] },
      { tipo: 'subida', clave: 'a', subida },
      { tipo: 'fallida', claves: ['a'], motivo: 'Sin conexión' },
    ])
    expect(item).toMatchObject({ estado: 'fallida', motivo: 'Sin conexión', subida })
  })

  it('las guardadas salen de la bandeja; las demás se quedan', () => {
    const bandeja = aplicar([
      elegir('a', 'b'),
      leer('a'),
      leer('b'),
      { tipo: 'guardadas', hashes: ['a'] },
    ])
    expect(bandeja.map((item) => item.clave)).toEqual(['b'])
  })

  it('quitar una y vaciar', () => {
    const bandeja = aplicar([elegir('a', 'b'), { tipo: 'quitada', clave: 'a' }])
    expect(bandeja.map((item) => item.clave)).toEqual(['b'])
    expect(reducirBandeja(bandeja, { tipo: 'vaciada' })).toEqual([])
  })
})

describe('verBandeja', () => {
  it('entran, en el orden en que se eligieron, las que caben', () => {
    const bandeja = aplicar([elegir('a', 'b', 'c'), leer('c'), leer('a'), leer('b')])
    const vistos = verBandeja(bandeja, new Set(), 2)
    expect(vistos.map((item) => item.disposicion)).toEqual(['entra', 'entra', 'no_entra'])
    expect(vistos[2]?.aviso).toMatch(/admite 24 fotos/)
  })

  it('la que ya está en el vehículo no entra ni ocupa lugar', () => {
    const bandeja = aplicar([elegir('a', 'b'), leer('a'), leer('b')])
    const vistos = verBandeja(bandeja, new Set(['a']), 1)
    expect(vistos.map((item) => item.disposicion)).toEqual(['no_entra', 'entra'])
    expect(vistos[0]?.aviso).toBe('Ya está en este vehículo.')
  })

  it('la que todavía se está leyendo queda pendiente, y la rechazada dice su motivo', () => {
    const bandeja = aplicar([
      elegir('a'),
      { tipo: 'elegidas', items: [{ clave: 'b', nombre: 'b.pdf', motivo: 'No es una foto' }] },
    ])
    const vistos = verBandeja(bandeja, new Set(), 5)
    expect(vistos.map((item) => item.disposicion)).toEqual(['pendiente', 'no_entra'])
    expect(vistos[1]?.aviso).toBe('No es una foto')
  })
})

describe('paraSubir y contarBandeja', () => {
  const bandeja = aplicar([
    elegir('a', 'b', 'c', 'd'),
    leer('a'),
    leer('b'),
    leer('c'),
    { tipo: 'fallida', claves: ['b'], motivo: 'Sin conexión' },
  ])

  it('se suben las listas y las que fallaron, no las que no entran', () => {
    const vistos = verBandeja(bandeja, new Set(), 2)
    expect(paraSubir(vistos).map((item) => item.clave)).toEqual(['a', 'b'])
  })

  it('cuenta cada cosa por separado', () => {
    expect(contarBandeja(verBandeja(bandeja, new Set(), 2))).toEqual({
      preparando: 1,
      listas: 1,
      fallidas: 1,
      subiendo: 0,
      noEntran: 1,
      candidatas: 3,
    })
  })
})

describe('etiquetaDeSubir', () => {
  const conteo = { preparando: 0, listas: 0, fallidas: 0, subiendo: 0, noEntran: 0, candidatas: 0 }

  it('dice cuántas se van a subir', () => {
    expect(etiquetaDeSubir({ ...conteo, listas: 1 })).toBe('Subir 1 foto')
    expect(etiquetaDeSubir({ ...conteo, listas: 3 })).toBe('Subir 3 fotos')
  })

  it('con alguna fallida es un reintento de las que faltan', () => {
    expect(etiquetaDeSubir({ ...conteo, fallidas: 3 })).toBe('Reintentar las 3 que faltan')
    expect(etiquetaDeSubir({ ...conteo, fallidas: 1 })).toBe('Reintentar la que falta')
  })

  it('sin nada que subir no hay botón', () => {
    expect(etiquetaDeSubir({ ...conteo, noEntran: 2 })).toBeNull()
  })
})
