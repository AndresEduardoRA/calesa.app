import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CLAVES_DE_ICONO } from '@/shared/lib/iconos'
import { IconoDelCatalogo } from './icono-del-catalogo'
import { SimbolosDeIconos, idDelSimbolo } from './simbolos-de-iconos'
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

describe('el icono de una lista, con su símbolo compartido', () => {
  it('dibuja un <use> que apunta al símbolo (2 nodos) y no trae los trazos en línea', () => {
    const { container } = render(<IconoDelCatalogo clave="casa" deLista />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('data-icono')).toBe('casa')
    expect(svg?.querySelector('use')?.getAttribute('href')).toBe('#icono-casa')
    expect(svg?.querySelectorAll('path, circle, rect').length).toBe(0)
    expect(svg?.querySelectorAll('*').length).toBe(1)
  })

  it('una clave desconocida usa el símbolo neutro; sin icono, nada', () => {
    const { container } = render(<IconoDelCatalogo clave="marciano" deLista />)
    expect(container.querySelector('use')?.getAttribute('href')).toBe('#icono-desconocido')
    const vacio = render(<IconoDelCatalogo clave={null} deLista />)
    expect(vacio.container.innerHTML).toBe('')
  })

  it('el símbolo trae sólo las claves usadas, sin repetir, y uno neutro si alguna no se conoce', () => {
    const { container } = render(
      <SimbolosDeIconos claves={['casa', 'casa', null, '', 'barco', 'marciano']} />,
    )
    const ids = [...container.querySelectorAll('g[id]')].map((g) => g.getAttribute('id'))
    expect(ids).toEqual(['icono-casa', 'icono-barco', 'icono-desconocido'])
    expect(idDelSimbolo('casa')).toBe('icono-casa')
    expect(idDelSimbolo('phone')).toBe('icono-desconocido')
  })

  it('sin claves no monta nada', () => {
    expect(render(<SimbolosDeIconos claves={[null, undefined, ' ']} />).container.innerHTML).toBe(
      '',
    )
  })
})
