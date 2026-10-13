import { describe, expect, it } from 'vitest'
import { convieneJpeg, dimensionesAjustadas, extensionDe, hashDe } from './imagenes'

describe('dimensionesAjustadas', () => {
  it('achica el lado mayor y conserva la proporción', () => {
    expect(dimensionesAjustadas({ ancho: 4000, alto: 3000 }, 1600)).toEqual({
      ancho: 1600,
      alto: 1200,
    })
    expect(dimensionesAjustadas({ ancho: 1000, alto: 4000 }, 512)).toEqual({
      ancho: 128,
      alto: 512,
    })
  })

  it('nunca agranda', () => {
    expect(dimensionesAjustadas({ ancho: 300, alto: 200 }, 1600)).toEqual({ ancho: 300, alto: 200 })
  })

  it('no deja un lado en cero', () => {
    expect(dimensionesAjustadas({ ancho: 10000, alto: 2 }, 100)).toEqual({ ancho: 100, alto: 1 })
  })
})

describe('extensionDe', () => {
  it('sale del tipo del archivo, no de lo que se pidió', () => {
    expect(extensionDe('image/webp')).toBe('webp')
    expect(extensionDe('image/jpeg')).toBe('jpg')
    expect(extensionDe('image/png')).toBe('png')
  })

  it('lo que no es una imagen de las nuestras no tiene extensión', () => {
    expect(extensionDe('image/heic')).toBeNull()
    expect(extensionDe('')).toBeNull()
  })
})

describe('convieneJpeg', () => {
  it('cuando se pidió WebP y el navegador devolvió otra cosa (Safari devuelve PNG)', () => {
    expect(convieneJpeg('image/webp', 'image/png')).toBe(true)
    expect(convieneJpeg('image/webp', 'image/webp')).toBe(false)
  })

  it('un PNG pedido a propósito se queda en PNG', () => {
    expect(convieneJpeg('image/png', 'image/png')).toBe(false)
  })
})

describe('hashDe', () => {
  it('da el mismo nombre al mismo contenido', async () => {
    const a = await hashDe(new Blob(['hola']))
    const b = await hashDe(new Blob(['hola']))
    expect(a).toBe(b)
    expect(a).toBe('b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79')
  })

  it('distingue contenidos distintos', async () => {
    expect(await hashDe(new Blob(['hola']))).not.toBe(await hashDe(new Blob(['chau'])))
  })
})
