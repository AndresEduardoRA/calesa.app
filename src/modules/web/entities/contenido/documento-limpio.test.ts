import { describe, expect, it } from 'vitest'
import { htmlDelDocumento } from './doc'
import { documentoLimpio } from './documento-limpio'

const texto = (text: string, marks?: unknown[]) => ({
  type: 'text',
  text,
  ...(marks ? { marks } : {}),
})
const parrafo = (...hijos: unknown[]) => ({ type: 'paragraph', content: hijos })
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const item = (...content: unknown[]) => ({ type: 'listItem', content })

// Todo lo que sale del editor tiene que entrar en la lista blanca: es lo que la base exige al guardar.
function html(valor: unknown): string {
  const limpio = documentoLimpio(valor)
  const resultado = htmlDelDocumento(limpio)
  expect(resultado.ok).toBe(true)
  const salida = resultado.ok ? resultado.html : ''
  expect(salida).not.toMatch(/<script|javascript:|src=/i)
  return salida
}

describe('documentoLimpio', () => {
  it('el enlace de Tiptap pierde target, rel y class y queda con su href', () => {
    const enlace = {
      type: 'link',
      attrs: { href: 'https://a.test/x', target: '_blank', rel: 'noopener', class: 'c' },
    }
    expect(html(doc(parrafo(texto('ver', [enlace]))))).toBe(
      '<p><a href="https://a.test/x" rel="noopener noreferrer nofollow">ver</a></p>',
    )
  })

  it('un enlace peligroso se pierde y su texto queda', () => {
    const malo = { type: 'link', attrs: { href: 'javascript:alert(1)' } }
    expect(html(doc(parrafo(texto('clic', [malo]))))).toBe('<p>clic</p>')
  })

  it('los títulos 2 y 3 se mantienen; el 1 y el 4 bajan a 3', () => {
    const titulo = (level: number) => ({
      type: 'heading',
      attrs: { level },
      content: [texto('T')],
    })
    expect(html(doc(titulo(2), titulo(3), titulo(1), titulo(4)))).toBe(
      '<h2>T</h2><h3>T</h3><h3>T</h3><h3>T</h3>',
    )
  })

  it('un título dentro de una lista o de una cita es un párrafo', () => {
    const titulo = { type: 'heading', attrs: { level: 2 }, content: [texto('T')] }
    expect(
      html(
        doc(
          { type: 'bulletList', content: [item(titulo)] },
          { type: 'blockquote', content: [titulo] },
        ),
      ),
    ).toBe('<ul><li><p>T</p></li></ul><blockquote><p>T</p></blockquote>')
  })

  it('la lista numerada pierde el type y sólo conserva un start mayor que 1', () => {
    const lista = (attrs: unknown) => ({
      type: 'orderedList',
      attrs,
      content: [item(parrafo(texto('a')))],
    })
    expect(html(doc(lista({ start: 1, type: null })))).toBe('<ol><li><p>a</p></li></ol>')
    expect(html(doc(lista({ start: 3, type: null })))).toBe('<ol start="3"><li><p>a</p></li></ol>')
  })

  it('una imagen del primer nivel entra; anidada o de otro host se descarta', () => {
    const imagen = { type: 'image', attrs: { ruta: 'guias/abc123.webp', alt: 'Un auto' } }
    expect(html(doc(parrafo(texto('x')), imagen))).toBe(
      '<p>x</p><img data-ruta="guias/abc123.webp" alt="Un auto">',
    )
    const ajena = { type: 'image', attrs: { ruta: 'https://x.test/a.png', alt: '' } }
    expect(
      html(
        doc(parrafo(texto('x')), ajena, {
          type: 'blockquote',
          content: [parrafo(texto('y')), imagen],
        }),
      ),
    ).toBe('<p>x</p><blockquote><p>y</p></blockquote>')
  })
})

describe('documentoLimpio: lo que no cabe', () => {
  it('una lista demasiado honda se aplana y sigue dentro de la lista blanca', () => {
    const hondo = {
      type: 'bulletList',
      content: [
        item(parrafo(texto('uno')), {
          type: 'bulletList',
          content: [
            item(parrafo(texto('dos')), {
              type: 'bulletList',
              content: [
                item(parrafo(texto('tres')), {
                  type: 'bulletList',
                  content: [item(parrafo(texto('cuatro')))],
                }),
              ],
            }),
          ],
        }),
      ],
    }
    const salida = html(doc(hondo))
    for (const palabra of ['uno', 'dos', 'tres', 'cuatro']) {
      expect(salida).toContain(palabra)
    }
  })

  it('nodos y marcas desconocidos se pierden, el texto queda', () => {
    const raro = { type: 'codeBlock', content: [texto('let x')] }
    expect(html(doc(raro, parrafo(texto('b', [{ type: 'underline' }, { type: 'bold' }]))))).toBe(
      '<p>let x</p><p><strong>b</strong></p>',
    )
  })

  it('sin texto ni imagen no hay cuerpo', () => {
    expect(documentoLimpio(doc())).toBeNull()
    expect(documentoLimpio(doc({ type: 'paragraph' }))).toBeNull()
    expect(documentoLimpio(null)).toBeNull()
    expect(documentoLimpio(doc({ type: 'heading', attrs: { level: 2 } }))).toBeNull()
  })
})
