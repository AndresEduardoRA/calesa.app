import { describe, expect, it } from 'vitest'
import { SIN_PERSPECTIVA, leerPerspectiva, perspectivaDesde } from './perspectiva'

const ROL = '00000000-0000-0000-0000-0000000000aa'

describe('leerPerspectiva', () => {
  it('acepta el id de un rol', () => {
    expect(leerPerspectiva(ROL)).toBe(ROL)
  })

  it('sin cookie, o con cualquier otra cosa, no hay perspectiva', () => {
    expect(leerPerspectiva(undefined)).toBeNull()
    expect(leerPerspectiva('')).toBeNull()
    expect(leerPerspectiva('dueno')).toBeNull()
    expect(leerPerspectiva(`${ROL}' or 1=1`)).toBeNull()
  })
})

describe('perspectivaDesde', () => {
  it('da forma a lo que dice mi_sesion()', () => {
    const rol = { id: ROL, nombre: 'Asesor', color: '#027a48' }
    expect(perspectivaDesde({ disponible: true, rol, roles: [rol] })).toEqual({
      disponible: true,
      rol,
      roles: [rol],
    })
  })

  it('sin el dato no hay perspectiva', () => {
    expect(perspectivaDesde(undefined)).toEqual(SIN_PERSPECTIVA)
    expect(perspectivaDesde(null)).toEqual(SIN_PERSPECTIVA)
  })

  it('una forma inesperada es un error', () => {
    expect(() => perspectivaDesde({ disponible: 'sí' })).toThrow()
  })
})
