import { beforeAll, describe, expect, it } from 'vitest'
import { urlPublica, urlPublicaONull } from './almacen'

beforeAll(() => {
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'http://127.0.0.1:54621/'
  process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = 'sb_publishable_prueba'
})

describe('urlPublica', () => {
  it('arma la URL del objeto sin duplicar la barra', () => {
    expect(urlPublica('avatares', 'abc/foto.webp')).toBe(
      'http://127.0.0.1:54621/storage/v1/object/public/avatares/abc/foto.webp',
    )
  })

  it('codifica cada tramo de la ruta', () => {
    expect(urlPublica('marca', 'logo final.png')).toBe(
      'http://127.0.0.1:54621/storage/v1/object/public/marca/logo%20final.png',
    )
  })
})

describe('urlPublicaONull', () => {
  it('devuelve null sin ruta', () => {
    expect(urlPublicaONull('marca', null)).toBeNull()
    expect(urlPublicaONull('marca', '')).toBeNull()
  })
})
