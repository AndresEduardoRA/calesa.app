import { describe, expect, it } from 'vitest'
import {
  ALTO_DEL_ROTULO,
  LADO_MAXIMO,
  SEPARACION,
  disposicion,
  medidasDeLaHoja,
  medidasDelPng,
  partirEnHojas,
} from './hoja-de-contacto.mjs'

const ESCRITORIO = { ancho: 1280, alto: 720 }
const CELULAR = { ancho: 1082, alto: 2202 }

describe('hoja de contacto: la disposición', () => {
  it('lo apaisado va de a cuatro (2×2) y lo vertical de a tres (3×1)', () => {
    expect(disposicion(ESCRITORIO)).toEqual({ columnas: 2, filas: 2 })
    expect(disposicion(CELULAR)).toEqual({ columnas: 3, filas: 1 })
  })

  it('lo que se pide manda sobre lo de fábrica, de a una medida', () => {
    expect(disposicion(ESCRITORIO, { columnas: 1 })).toEqual({ columnas: 1, filas: 2 })
    expect(disposicion(CELULAR, { filas: 2, columnas: 2 })).toEqual({ columnas: 2, filas: 2 })
  })
})

describe('hoja de contacto: el tamaño', () => {
  it('ninguna hoja pasa de 2.000 px de lado, con el escritorio ni con el celular', () => {
    for (const captura of [ESCRITORIO, CELULAR]) {
      const { hoja } = medidasDeLaHoja(captura, disposicion(captura))
      expect(hoja.ancho).toBeLessThanOrEqual(LADO_MAXIMO)
      expect(hoja.alto).toBeLessThanOrEqual(LADO_MAXIMO)
    }
  })

  it('una captura chica entra a tamaño real: no se agranda', () => {
    const { escala, celda } = medidasDeLaHoja({ ancho: 300, alto: 200 }, { columnas: 2, filas: 2 })
    expect(escala).toBe(1)
    expect(celda).toEqual({ ancho: 300, alto: 200 })
  })

  it('el celular se achica lo justo: tres a lo ancho, el alto manda y el texto sigue legible (≥ 0,5)', () => {
    const { escala, hoja } = medidasDeLaHoja(CELULAR, { columnas: 3, filas: 1 })
    expect(escala).toBeGreaterThan(0.5)
    expect(escala).toBeLessThan(1)
    expect(hoja.alto).toBeLessThanOrEqual(LADO_MAXIMO)
  })

  it('la hoja suma celdas, rótulos y separaciones', () => {
    const { celda, hoja } = medidasDeLaHoja(ESCRITORIO, { columnas: 2, filas: 2 })
    expect(hoja.ancho).toBe(2 * celda.ancho + 3 * SEPARACION)
    expect(hoja.alto).toBe(2 * (celda.alto + ALTO_DEL_ROTULO) + 3 * SEPARACION)
  })
})

describe('hoja de contacto: partir en hojas', () => {
  it('conserva el orden por nombre y no deja capturas afuera', () => {
    const nombres = ['b-02.png', 'a-10.png', 'a-02.png', 'a-01.png', 'b-01.png']
    const hojas = partirEnHojas(nombres, 2)
    expect(hojas).toEqual([['a-01.png', 'a-02.png'], ['a-10.png', 'b-01.png'], ['b-02.png']])
    expect(hojas.flat().sort()).toEqual([...nombres].sort())
  })

  it('sin capturas no hay hojas', () => {
    expect(partirEnHojas([], 4)).toEqual([])
  })
})

describe('hoja de contacto: las medidas de un PNG', () => {
  it('se leen de su cabecera, sin decodificarlo', () => {
    const cabecera = Buffer.alloc(24)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(cabecera)
    cabecera.writeUInt32BE(1082, 16)
    cabecera.writeUInt32BE(2202, 20)
    expect(medidasDelPng(cabecera)).toEqual({ ancho: 1082, alto: 2202 })
  })

  it('algo que no es un PNG se rechaza', () => {
    expect(() => medidasDelPng(Buffer.alloc(24))).toThrow('No es un PNG')
  })
})
