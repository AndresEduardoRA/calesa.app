import { describe, expect, it } from 'vitest'
import { mismoOrigenDelPortal } from './origen'

describe('mismoOrigenDelPortal: la puerta contra CSRF de los POST del portal', () => {
  it('K2 · el mismo esquema, host y puerto vale, aunque la dirección traiga camino', () => {
    expect(
      mismoOrigenDelPortal('http://localhost:3210', 'http://localhost:3210/api/portal/ingresar'),
    ).toBe(true)
    expect(mismoOrigenDelPortal('https://sitio.bo', 'https://sitio.bo/inicio')).toBe(true)
    expect(mismoOrigenDelPortal('https://sitio.bo', 'https://sitio.bo')).toBe(true)
  })

  it('K2 · otro puerto, esquema, host o un subdominio no valen', () => {
    expect(mismoOrigenDelPortal('http://localhost:3000', 'http://localhost:3210/x')).toBe(false)
    expect(mismoOrigenDelPortal('http://sitio.bo', 'https://sitio.bo')).toBe(false)
    expect(mismoOrigenDelPortal('https://otro.bo', 'https://sitio.bo')).toBe(false)
    expect(mismoOrigenDelPortal('https://www.sitio.bo', 'https://sitio.bo')).toBe(false)
    expect(mismoOrigenDelPortal('https://sitio.bo.ajeno.com', 'https://sitio.bo')).toBe(false)
  })

  it('K2 · un origen nulo u opaco, o una dirección nula o inválida, no valen', () => {
    expect(mismoOrigenDelPortal(null, 'https://sitio.bo')).toBe(false)
    expect(mismoOrigenDelPortal('null', 'https://sitio.bo')).toBe(false)
    expect(mismoOrigenDelPortal('', 'https://sitio.bo')).toBe(false)
    expect(mismoOrigenDelPortal('https://sitio.bo', null)).toBe(false)
    expect(mismoOrigenDelPortal('https://sitio.bo', 'no es una url')).toBe(false)
    expect(mismoOrigenDelPortal('https://sitio.bo/', 'https://sitio.bo')).toBe(false)
  })
})
