import { describe, expect, it } from 'vitest'
import {
  MAXIMO_DE_IMAGENES_POR_ITEM,
  avisoDeAgregado,
  imagenesDesde,
  lugarPara,
  planDeAgregado,
  rutaDeImagenValida,
} from './imagenes'

const ITEM = '7f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const OTRO = '8f9c1d2e-3a4b-4c5d-8e6f-0123456789ab'
const ruta = (c: string, ext = 'webp', item = ITEM) => `${item}/${c.repeat(64)}.${ext}`

describe('el tope', () => {
  it('es 8 y el lugar nunca es negativo', () => {
    expect(MAXIMO_DE_IMAGENES_POR_ITEM).toBe(8)
    expect(lugarPara(0)).toBe(8)
    expect(lugarPara(3)).toBe(5)
    expect(lugarPara(8)).toBe(0)
    expect(lugarPara(11)).toBe(0)
  })
})

describe('la ruta de una imagen', () => {
  it('es de la carpeta del ítem, con el hash en minúscula y webp o jpg', () => {
    expect(rutaDeImagenValida(ITEM, ruta('a'))).toBe(true)
    expect(rutaDeImagenValida(ITEM, ruta('b', 'jpg'))).toBe(true)
  })
  it('rechaza otro ítem, mayúsculas, otra extensión, un hash corto y una ruta con más carpetas', () => {
    expect(rutaDeImagenValida(ITEM, ruta('a', 'webp', OTRO))).toBe(false)
    expect(rutaDeImagenValida(ITEM, ruta('A'))).toBe(false)
    expect(rutaDeImagenValida(ITEM, ruta('a', 'png'))).toBe(false)
    expect(rutaDeImagenValida(ITEM, `${ITEM}/${'a'.repeat(63)}.webp`)).toBe(false)
    expect(rutaDeImagenValida(ITEM, `${ITEM}/x/${'a'.repeat(64)}.webp`)).toBe(false)
  })
})

describe('qué se agrega', () => {
  it('guarda lo nuevo en el orden pedido', () => {
    const plan = planDeAgregado({ existentes: [ruta('a')], pedidas: [ruta('c'), ruta('b')] })
    expect(plan).toEqual({ aGuardar: [ruta('c'), ruta('b')], repetidas: [], sinLugar: [] })
  })
  it('lo que ya está o viene dos veces es repetido, no error', () => {
    const plan = planDeAgregado({
      existentes: [ruta('a')],
      pedidas: [ruta('a'), ruta('b'), ruta('b')],
    })
    expect(plan).toEqual({ aGuardar: [ruta('b')], repetidas: [ruta('a'), ruta('b')], sinLugar: [] })
  })
  it('lo que no cabe va a sin lugar, y las primeras entran', () => {
    const existentes = ['a', 'b', 'c', 'd', 'e', 'f'].map((c) => ruta(c))
    const plan = planDeAgregado({ existentes, pedidas: [ruta('1'), ruta('2'), ruta('3')] })
    expect(plan.aGuardar).toEqual([ruta('1'), ruta('2')])
    expect(plan.sinLugar).toEqual([ruta('3')])
  })
  it('con el ítem lleno nada entra, y sin pedidas no hay plan', () => {
    const lleno = 'abcdef01'.split('').map((c) => ruta(c))
    expect(planDeAgregado({ existentes: lleno, pedidas: [ruta('2')] }).sinLugar).toHaveLength(1)
    expect(planDeAgregado({ existentes: [], pedidas: [] })).toEqual({
      aGuardar: [],
      repetidas: [],
      sinLugar: [],
    })
  })
})

describe('las filas de la base', () => {
  it('se ordenan por su orden y se descarta lo malformado', () => {
    const imagenes = imagenesDesde([
      { id: OTRO, ruta: ruta('b'), orden: 1 },
      { id: 'no-es-guid', ruta: ruta('c'), orden: 0 },
      { id: ITEM, ruta: ruta('a'), orden: 0 },
      { id: ITEM, ruta: '', orden: 2 },
    ])
    expect(imagenes.map((i) => i.ruta)).toEqual([ruta('a'), ruta('b')])
    expect(imagenesDesde(null)).toEqual([])
  })
})

describe('el aviso de agregar', () => {
  it('dice lo que entró, lo que ya estaba y lo que no cupo', () => {
    expect(avisoDeAgregado({ agregadas: 2, repetidas: 0, sinLugar: 0 })).toBe(
      'Se subieron 2 imágenes.',
    )
    expect(avisoDeAgregado({ agregadas: 1, repetidas: 1, sinLugar: 3 })).toBe(
      'Se subió 1 imagen. Una ya estaba. 3 no cupieron (el tope es 8).',
    )
    expect(avisoDeAgregado({ agregadas: 0, repetidas: 0, sinLugar: 0 })).toBe(
      'No había nada que subir.',
    )
  })
})
