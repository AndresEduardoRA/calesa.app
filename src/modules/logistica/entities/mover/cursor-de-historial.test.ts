import { describe, expect, it } from 'vitest'
import { codificarCursorDeHistorial, leerCursorDeHistorial } from './cursor-de-historial'

describe('cursor del historial', () => {
  const cursor = { instante: '2026-11-12T10:00:00.123456+00:00', id: 41 }
  it('va y vuelve, y el texto cabe en una URL', () => {
    const texto = codificarCursorDeHistorial(cursor)
    expect(texto).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(leerCursorDeHistorial(texto)).toEqual(cursor)
  })
  it('uno ilegible, sin forma o con un id que no es número es la primera página', () => {
    expect(leerCursorDeHistorial(null)).toBeNull()
    expect(leerCursorDeHistorial('x')).toBeNull()
    expect(leerCursorDeHistorial('%%%%%%%%%%%')).toBeNull()
    const sinNumero = btoa(`${cursor.instante}|abc`).replaceAll('=', '')
    expect(leerCursorDeHistorial(sinNumero)).toBeNull()
    const sinInstante = btoa('ayer|41').replaceAll('=', '')
    expect(leerCursorDeHistorial(sinInstante)).toBeNull()
  })
})
