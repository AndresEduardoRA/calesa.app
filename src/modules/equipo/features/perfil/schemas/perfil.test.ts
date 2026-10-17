import { describe, expect, it } from 'vitest'
import { esAvatarDe, esquemaPerfil } from './perfil'

const ID = '00000000-0000-0000-0000-000000000001'
const RUTA = `${ID}/${'a'.repeat(64)}.webp`
const base = { nombre: 'Ana Quispe', actualizadoEnEsperado: '2026-10-11T15:00:00+00:00' }

describe('esquemaPerfil', () => {
  it('acepta guardar sólo el nombre, con foto nueva o quitándola', () => {
    expect(esquemaPerfil.parse(base).avatarRuta).toBeUndefined()
    expect(esquemaPerfil.parse({ ...base, avatarRuta: RUTA }).avatarRuta).toBe(RUTA)
    expect(esquemaPerfil.parse({ ...base, avatarRuta: null }).avatarRuta).toBeNull()
  })

  it('acepta la foto en JPEG de un navegador que no codifica WebP', () => {
    const enJpeg = `${ID}/${'b'.repeat(64)}.jpg`
    expect(esquemaPerfil.parse({ ...base, avatarRuta: enJpeg }).avatarRuta).toBe(enJpeg)
  })

  it('rechaza una ruta que no salió de subirAvatar()', () => {
    expect(esquemaPerfil.safeParse({ ...base, avatarRuta: '../marca/logo.png' }).success).toBe(
      false,
    )
    expect(esquemaPerfil.safeParse({ ...base, avatarRuta: `${ID}/foto.jpg` }).success).toBe(false)
  })

  it('la miniatura (cierre 1) sigue la misma regla que la foto', () => {
    const chica = `${ID}/${'c'.repeat(64)}.webp`
    expect(
      esquemaPerfil.parse({ ...base, avatarRuta: RUTA, avatarMiniaturaRuta: chica })
        .avatarMiniaturaRuta,
    ).toBe(chica)
    expect(
      esquemaPerfil.safeParse({ ...base, avatarRuta: RUTA, avatarMiniaturaRuta: '../x.webp' })
        .success,
    ).toBe(false)
  })

  it('recorta el nombre y exige que tenga algo', () => {
    expect(esquemaPerfil.parse({ ...base, nombre: '  Ana Quispe ' }).nombre).toBe('Ana Quispe')
    expect(esquemaPerfil.safeParse({ ...base, nombre: ' a ' }).success).toBe(false)
  })
})

describe('esAvatarDe', () => {
  it('sólo vale la carpeta propia', () => {
    expect(esAvatarDe(ID, RUTA)).toBe(true)
    expect(esAvatarDe('00000000-0000-0000-0000-000000000002', RUTA)).toBe(false)
  })
})
