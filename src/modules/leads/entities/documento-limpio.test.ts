import { describe, expect, it } from 'vitest'
import { validarDocumento } from './documento'
import { documentoDesdeTexto, documentoLimpio } from './documento-limpio'

// Lo que entrega `editor.getJSON()` de Tiptap con el enlace y la lista numerada configurados.
const DEL_EDITOR = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Ver ' },
        {
          type: 'text',
          text: 'la ficha',
          marks: [
            {
              type: 'link',
              attrs: { href: 'https://a.com', target: '_blank', rel: 'noopener', class: null },
            },
            { type: 'bold' },
          ],
        },
      ],
    },
    {
      type: 'orderedList',
      attrs: { start: 1, type: null },
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'uno' }] }],
        },
      ],
    },
    { type: 'paragraph' },
  ],
}

describe('documentoLimpio', () => {
  it('deja sólo lo que la base acepta, y lo que queda pasa la lista blanca', () => {
    const limpio = documentoLimpio(DEL_EDITOR)
    expect(limpio).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Ver ' },
            {
              type: 'text',
              text: 'la ficha',
              marks: [{ type: 'link', attrs: { href: 'https://a.com' } }, { type: 'bold' }],
            },
          ],
        },
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'uno' }] }],
            },
          ],
        },
        { type: 'paragraph' },
      ],
    })
    expect(validarDocumento(limpio)).toMatchObject({ ok: true, texto: 'Ver la ficha\n1. uno' })
  })
  it('un enlace inseguro se pierde, el texto queda; lo desconocido queda como texto', () => {
    const limpio = documentoLimpio({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }, { type: 'strike' }],
            },
          ],
        },
        { type: 'heading', content: [{ type: 'text', text: 'Título' }] },
        { type: 'orderedList', attrs: { start: 4 }, content: [{ type: 'listItem', content: [] }] },
      ],
    })
    expect(limpio?.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Título' }] },
      {
        type: 'orderedList',
        attrs: { start: 4 },
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      },
    ])
    expect(validarDocumento(limpio).ok).toBe(true)
  })
  it('sin texto es «sin detalle»', () => {
    expect(documentoLimpio({ type: 'doc', content: [{ type: 'paragraph' }] })).toBeNull()
    expect(documentoLimpio(null)).toBeNull()
  })
})

describe('documentoDesdeTexto', () => {
  it('un párrafo por línea; vacío es nulo', () => {
    expect(documentoDesdeTexto('a\n\nb')?.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
    ])
    expect(validarDocumento(documentoDesdeTexto('a\n\nb'))).toMatchObject({
      ok: true,
      texto: 'a\n\nb',
    })
    expect(documentoDesdeTexto('  ')).toBeNull()
    expect(documentoDesdeTexto(null)).toBeNull()
  })
})
