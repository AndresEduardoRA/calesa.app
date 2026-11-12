import { describe, expect, it } from 'vitest'
import { cambiosDeLegales, legalesDesde, legalesInvalidos, sinImagenes } from './legales'

const parrafo = (texto: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text: texto }],
})
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const imagen = { type: 'image', attrs: { ruta: 'guias/a.webp', alt: 'a' } }
const VACIO = doc({ type: 'paragraph' })

const guardado = {
  titulo: 'Términos',
  doc: doc(parrafo('Pagas al recibir.')),
  actualizado_en: '2026-11-12T10:00:00Z',
}
const VERSION = '2026-11-12T10:00:00.000000+00:00'

describe('legalesDesde', () => {
  it('lee lo guardado', () => {
    const leidos = legalesDesde({ terminos: guardado }, VERSION)
    expect(leidos.terminos?.titulo).toBe('Términos')
    expect(leidos.privacidad).toBeNull()
    expect(leidos.actualizadoEn).toBe(VERSION)
  })
  it('una forma rota, una clave desconocida o un documento fuera de la lista blanca no lanzan: es «no hay»', () => {
    expect(legalesDesde(null, VERSION).terminos).toBeNull()
    expect(legalesDesde('texto', VERSION).terminos).toBeNull()
    const roto = legalesDesde(
      {
        otra: guardado,
        terminos: { titulo: 3, doc: guardado.doc },
        privacidad: { titulo: 'P', doc: doc({ type: 'script' }) },
      },
      VERSION,
    )
    expect(roto.terminos).toBeNull()
    expect(roto.privacidad).toBeNull()
  })
})

describe('cambiosDeLegales', () => {
  it('omite el documento vacío y recorta el título', () => {
    const cambios = cambiosDeLegales({
      terminos: { titulo: '  Términos  ', doc: doc(parrafo('Hola.')) },
      privacidad: { titulo: 'Política', doc: VACIO },
    })
    expect(Object.keys(cambios)).toEqual(['terminos'])
    expect(cambios.terminos?.titulo).toBe('Términos')
  })
  it('quita las imágenes; un documento que sólo era una imagen se omite', () => {
    const cambios = cambiosDeLegales({
      terminos: { titulo: 'T', doc: doc(parrafo('Hola.'), imagen) },
      privacidad: { titulo: 'P', doc: doc(imagen) },
    })
    expect(cambios.terminos?.doc.content.map((bloque) => bloque.type)).toEqual(['paragraph'])
    expect(cambios.privacidad).toBeUndefined()
  })
  it('sinImagenes deja el resto', () => {
    expect(sinImagenes({ type: 'doc', content: [imagen as never] }).content).toEqual([])
  })
})

describe('legalesInvalidos', () => {
  const ninguno = { terminos: null, privacidad: null }
  const guardadoDe = legalesDesde({ terminos: guardado }, VERSION)
  it('un legal guardado al que se le vacía el texto no se puede guardar', () => {
    const motivos = legalesInvalidos(
      { terminos: { titulo: 'T', doc: VACIO }, privacidad: { titulo: 'P', doc: VACIO } },
      guardadoDe,
    )
    expect(motivos).toEqual({ terminos: 'Escribe el texto de los términos.' })
  })
  it('sin nada guardado ni escrito no hay motivos', () => {
    expect(
      legalesInvalidos(
        { terminos: { titulo: '', doc: VACIO }, privacidad: { titulo: '', doc: VACIO } },
        ninguno,
      ),
    ).toEqual({})
  })
  it('un título vacío o de 121 caracteres con texto da su motivo', () => {
    const motivos = legalesInvalidos(
      {
        terminos: { titulo: '   ', doc: doc(parrafo('Hola.')) },
        privacidad: { titulo: 'x'.repeat(121), doc: doc(parrafo('Hola.')) },
      },
      ninguno,
    )
    expect(motivos.terminosTitulo).toBe('Escribe el título.')
    expect(motivos.privacidadTitulo).toBe('El título lleva hasta 120 caracteres.')
  })
})
