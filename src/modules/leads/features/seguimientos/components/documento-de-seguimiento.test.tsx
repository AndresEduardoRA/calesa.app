import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DocumentoDeSeguimiento } from './documento-de-seguimiento'

const doc = (...content: unknown[]) => ({ type: 'doc', content })
const p = (...content: unknown[]) => ({ type: 'paragraph', content })

describe('DocumentoDeSeguimiento', () => {
  it('dibuja negrita, cursiva, listas y enlaces seguros', () => {
    const { container } = render(
      <DocumentoDeSeguimiento
        texto="x"
        documento={doc(
          p(
            { type: 'text', text: 'Quiere ', marks: [{ type: 'italic' }] },
            { type: 'text', text: 'RAV4', marks: [{ type: 'bold' }] },
            {
              type: 'text',
              text: 'ficha',
              marks: [{ type: 'link', attrs: { href: 'https://a.com' } }],
            },
            {
              type: 'text',
              text: 'llamar',
              marks: [{ type: 'link', attrs: { href: 'tel:+591700' } }],
            },
          ),
          {
            type: 'orderedList',
            attrs: { start: 3 },
            content: [{ type: 'listItem', content: [p({ type: 'text', text: 'tres' })] }],
          },
        )}
      />,
    )
    expect(container.querySelector('strong')?.textContent).toBe('RAV4')
    expect(container.querySelector('em')?.textContent).toBe('Quiere ')
    const web = screen.getByRole('link', { name: 'ficha' })
    expect(web.getAttribute('href')).toBe('https://a.com')
    expect(web.getAttribute('rel')).toBe('noopener noreferrer nofollow')
    expect(web.getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('link', { name: 'llamar' }).getAttribute('target')).toBeNull()
    expect(container.querySelector('ol')?.getAttribute('start')).toBe('3')
  })

  it('un documento con algo fuera de la lista blanca no se dibuja: va el texto plano, inerte', () => {
    const { container } = render(
      <DocumentoDeSeguimiento
        texto={'<img src=x onerror="alert(1)">\nsegunda línea'}
        documento={doc(
          p({
            type: 'text',
            text: 'x',
            marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
          }),
          { type: 'image', attrs: { src: 'x', onerror: 'alert(1)' } },
        )}
      />,
    )
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
  })

  it('sin documento, el texto del alta con sus saltos; sin nada, nada', () => {
    const { container, rerender } = render(
      <DocumentoDeSeguimiento documento={null} texto={'a\nb'} />,
    )
    expect(container.querySelector('p')?.className).toContain('whitespace-pre-line')
    rerender(<DocumentoDeSeguimiento documento={null} texto={null} />)
    expect(container.textContent).toBe('')
  })
})
