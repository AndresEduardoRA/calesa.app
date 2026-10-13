import { describe, expect, it } from 'vitest'
import { PESO_MAXIMO_DE_ENTRADA } from './foto'
import {
  avisoDeTope,
  esHeic,
  mensajeDeRechazo,
  motivoDeLectura,
  motivoPorArchivo,
  repartirLugar,
  resumenDeSubida,
} from './seleccion-de-fotos'

const archivo = (nombre: string, tipo: string, peso = 1000) => ({ nombre, tipo, peso })

describe('motivoPorArchivo', () => {
  it('una imagen de tamaño normal pasa', () => {
    expect(motivoPorArchivo(archivo('a.jpg', 'image/jpeg'))).toBeNull()
    expect(motivoPorArchivo(archivo('a.avif', 'image/avif'))).toBeNull()
  })

  it('lo que no es una imagen se dice antes de leerlo', () => {
    expect(motivoPorArchivo(archivo('factura.pdf', 'application/pdf'))).toBe('no_es_foto')
    expect(motivoPorArchivo(archivo('video.mp4', 'video/mp4'))).toBe('no_es_foto')
  })

  it('un HEIC sin tipo declarado se deja pasar a la lectura, que es la que decide', () => {
    expect(motivoPorArchivo(archivo('IMG_0001.HEIC', ''))).toBeNull()
  })

  it('el tope es por archivo', () => {
    expect(motivoPorArchivo(archivo('a.jpg', 'image/jpeg', PESO_MAXIMO_DE_ENTRADA))).toBeNull()
    expect(motivoPorArchivo(archivo('a.jpg', 'image/jpeg', PESO_MAXIMO_DE_ENTRADA + 1))).toBe(
      'muy_grande',
    )
  })
})

describe('esHeic y motivoDeLectura', () => {
  it('por tipo o por extensión', () => {
    expect(esHeic(archivo('a.heic', ''))).toBe(true)
    expect(esHeic(archivo('a', 'image/heif'))).toBe(true)
    expect(esHeic(archivo('a.jpg', 'image/jpeg'))).toBe(false)
  })

  it('un HEIC que no se pudo leer tiene su propio motivo', () => {
    expect(motivoDeLectura(archivo('a.heic', 'image/heic'))).toBe('heic')
    expect(motivoDeLectura(archivo('a.jpg', 'image/jpeg'))).toBe('ilegible')
  })
})

describe('mensajeDeRechazo', () => {
  it('el de peso dice cuánto pesa y cuál es el máximo', () => {
    expect(mensajeDeRechazo('muy_grande', 31 * 1024 * 1024)).toBe(
      'Pesa 31 MB; el máximo por foto es 25 MB.',
    )
  })

  it('cada motivo tiene su frase, sin signos de exclamación', () => {
    for (const motivo of ['no_es_foto', 'heic', 'ilegible', 'repetida', 'sin_lugar'] as const) {
      expect(mensajeDeRechazo(motivo)).not.toMatch(/[¡!]/)
      expect(mensajeDeRechazo(motivo).length).toBeGreaterThan(10)
    }
  })
})

describe('repartirLugar', () => {
  it('entran, en orden, las que caben', () => {
    expect(repartirLugar(['a', 'b', 'c'], new Set(), 2)).toEqual([
      'aceptada',
      'aceptada',
      'sin_lugar',
    ])
  })

  it('la que ya está en el vehículo no entra ni ocupa lugar', () => {
    expect(repartirLugar(['a', 'b', 'c'], new Set(['a']), 2)).toEqual([
      'repetida',
      'aceptada',
      'aceptada',
    ])
  })

  it('la misma elegida dos veces entra una', () => {
    expect(repartirLugar(['a', 'a', 'b'], new Set(), 5)).toEqual([
      'aceptada',
      'repetida',
      'aceptada',
    ])
  })

  it('sin lugar no entra ninguna', () => {
    expect(repartirLugar(['a'], new Set(), 0)).toEqual(['sin_lugar'])
  })
})

describe('avisoDeTope', () => {
  it('si todo entra no hay nada que avisar', () => {
    expect(avisoDeTope({ tiene: 3, elegidas: 5, entran: 5 })).toBeNull()
  })

  it('dice cuántas tiene y cuántas de las elegidas van a entrar', () => {
    expect(avisoDeTope({ tiene: 22, elegidas: 5, entran: 2 })).toBe(
      'Este vehículo admite 24 fotos. Tiene 22: se van a subir las primeras 2 de las 5 que elegiste.',
    )
    expect(avisoDeTope({ tiene: 23, elegidas: 3, entran: 1 })).toBe(
      'Este vehículo admite 24 fotos. Tiene 23: se va a subir la primera de las 3 que elegiste.',
    )
  })

  it('lleno, dice cómo hacer lugar', () => {
    expect(avisoDeTope({ tiene: 24, elegidas: 1, entran: 0 })).toMatch(/ya las tiene/)
  })
})

describe('resumenDeSubida', () => {
  it('todo bien', () => {
    expect(resumenDeSubida({ guardadas: 1, fallidas: 0 })).toBe('Foto guardada')
    expect(resumenDeSubida({ guardadas: 3, fallidas: 0 })).toBe('3 fotos guardadas')
  })

  it('un resultado parcial se dice entero', () => {
    expect(resumenDeSubida({ guardadas: 5, fallidas: 3 })).toBe(
      'Se guardaron 5 de 8. Las otras 3 no se pudieron subir: revisa tu conexión y reintenta.',
    )
    expect(resumenDeSubida({ guardadas: 2, fallidas: 1 })).toBe(
      'Se guardaron 2 de 3. La otra no se pudo subir: revisa tu conexión y reintenta.',
    )
  })

  it('ninguna', () => {
    expect(resumenDeSubida({ guardadas: 0, fallidas: 2 })).toMatch(/^Ninguna de las 2 fotos/)
    expect(resumenDeSubida({ guardadas: 0, fallidas: 1 })).toMatch(/^La foto no se pudo subir/)
  })
})
