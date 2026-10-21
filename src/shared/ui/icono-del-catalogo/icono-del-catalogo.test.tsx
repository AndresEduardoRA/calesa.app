import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CLAVES_DE_ICONO } from '@/shared/lib/iconos'
import { IconoDelCatalogo } from './icono-del-catalogo'
import { TRAZOS } from './trazos'

describe('<IconoDelCatalogo>', () => {
  it('sin icono no dibuja nada', () => {
    for (const valor of [null, undefined, '']) {
      const { container } = render(<IconoDelCatalogo clave={valor} />)
      expect(container.innerHTML).toBe('')
    }
  })

  it('cada clave del catálogo tiene su trazo y se dibuja oculta al lector de pantalla', () => {
    expect(Object.keys(TRAZOS).sort()).toEqual([...CLAVES_DE_ICONO].sort())
    for (const clave of CLAVES_DE_ICONO) {
      const { container } = render(<IconoDelCatalogo clave={clave} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-hidden')).toBe('true')
      expect(svg?.getAttribute('data-icono')).toBe(clave)
      expect(svg?.querySelectorAll('path, circle, rect, line, polyline').length).toBeGreaterThan(0)
    }
  })

  it('una clave que no se conoce cae en el icono neutro, sin romper', () => {
    const { container } = render(<IconoDelCatalogo clave="message-circle" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('data-icono')).toBe('desconocido')
    expect(svg?.querySelector('circle')?.getAttribute('stroke-dasharray')).toBeTruthy()
  })

  it('no mete en el DOM lo que venga en la clave', () => {
    const { container } = render(<IconoDelCatalogo clave={'"><script>x</script>'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('data-icono')).toBe('desconocido')
  })
})
