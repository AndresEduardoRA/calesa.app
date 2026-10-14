import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fotosDeSubasta, fotosQueFaltan, resumenDeFotosDeSubasta } from './subasta-fotos'

function datos(nombre: string): Record<string, unknown> {
  const texto = readFileSync(join(process.cwd(), 'e2e/fixtures/apibara', nombre), 'utf8')
  return (JSON.parse(texto) as { data: Record<string, unknown> }).data
}

const COPART = datos('copart.json')
const IAAI = datos('iaai.json')

describe('fotosDeSubasta', () => {
  it('Copart: las imágenes en su mejor calidad, sin el video, la primera es la portada', () => {
    const fotos = fotosDeSubasta(COPART)
    expect(fotos).toHaveLength(14)
    expect(fotos[0]).toEqual({
      url: 'https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/0626/f8caf435090e4dc2bce7a7ffecdf7ac6_ful.jpg',
      orden: 1,
    })
    expect(fotos.every((foto) => foto.url.startsWith('https://cs.copart.com/'))).toBe(true)
    expect(fotos.some((foto) => foto.url.endsWith('.mp4'))).toBe(false)
  })

  it('IAAI: usa la grande cuando no hay completa, y deja fuera el video y el 360°', () => {
    const fotos = fotosDeSubasta(IAAI)
    expect(fotos).toHaveLength(17)
    expect(fotos[0]?.url).toContain('width=845')
    expect(fotos.some((foto) => foto.url.includes('ThreeSixtyView'))).toBe(false)
  })

  it('un tope de 24, sin repetir, y sin nada si no hay medios', () => {
    const items = Array.from({ length: 40 }, (_, n) => ({
      type: 'image',
      full: `https://cs.copart.com/${String(n % 30)}.jpg`,
    }))
    const fotos = fotosDeSubasta({ media: { items } })
    expect(fotos).toHaveLength(24)
    expect(new Set(fotos.map((foto) => foto.url)).size).toBe(24)
    expect(fotosDeSubasta({})).toEqual([])
    expect(fotosDeSubasta({ media: { items: 'no es lista' } })).toEqual([])
  })

  it('no acepta direcciones que no son https', () => {
    expect(
      fotosDeSubasta({ media: { items: [{ type: 'image', full: 'http://cs.copart.com/a.jpg' }] } }),
    ).toEqual([])
  })

  it('faltan las que la respuesta tiene y el vehículo no registró', () => {
    const todas = fotosDeSubasta(COPART)
    const registradas = todas.slice(0, 5).map((foto) => foto.url)
    const faltan = fotosQueFaltan(COPART, registradas)
    expect(faltan).toHaveLength(9)
    expect(faltan[0]?.orden).toBe(6)
    expect(
      fotosQueFaltan(
        COPART,
        todas.map((foto) => foto.url),
      ),
    ).toEqual([])
  })
})

describe('resumenDeFotosDeSubasta', () => {
  it('dice cuántas se guardaron y cuántas faltan, con el motivo', () => {
    expect(resumenDeFotosDeSubasta({ total: 14, guardadas: 14 })).toBe(
      'Se guardaron las 14 fotos de la subasta.',
    )
    expect(resumenDeFotosDeSubasta({ total: 1, guardadas: 1 })).toBe(
      'Se guardó la foto de la subasta.',
    )
    expect(resumenDeFotosDeSubasta({ total: 14, guardadas: 11 })).toBe(
      'Se guardaron 11 de 14 fotos de la subasta. Faltan 3. Puedes traerlas desde Fotos.',
    )
    expect(resumenDeFotosDeSubasta({ total: 14, guardadas: 13, motivo: 'apibara tardó.' })).toBe(
      'Se guardaron 13 de 14 fotos de la subasta. Falta 1. apibara tardó. Puedes traerlas desde Fotos.',
    )
    expect(resumenDeFotosDeSubasta({ total: 5, guardadas: 0 })).toBe(
      'No se pudo traer ninguna foto de la subasta. Puedes intentarlo desde Fotos.',
    )
    expect(resumenDeFotosDeSubasta({ total: 0, guardadas: 0 })).toBe(
      'No hay fotos nuevas que traer.',
    )
  })
})
