import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EstiloDeTonos } from './estilo-de-tonos'
import { cssDeTonos, type Tono } from './tonos'

const AMARILLO: Tono = {
  clave: 'amarillo',
  claro: { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' },
  oscuro: { fondo: '#3e3f3c', borde: '#797251', tinta: '#f2f4f8' },
}

describe('cssDeTonos', () => {
  it('escribe el claro y el oscuro de cada tono', () => {
    const css = cssDeTonos([AMARILLO])
    expect(css).toContain(
      '[data-tono=amarillo]{--tono-fondo:#fff7d6;--tono-borde:#e9d27a;--tono-tinta:#1b2130}',
    )
    expect(css).toContain(
      '.dark [data-tono=amarillo]{--tono-fondo:#3e3f3c;--tono-borde:#797251;--tono-tinta:#f2f4f8}',
    )
  })

  it('pasa el hex a minúsculas', () => {
    const css = cssDeTonos([{ ...AMARILLO, claro: { ...AMARILLO.claro, fondo: '#FFF7D6' } }])
    expect(css).toContain('--tono-fondo:#fff7d6')
  })

  it('descarta un tono con una clave que no es una clave', () => {
    for (const clave of [
      'Amarillo',
      'a',
      '1x',
      'a b',
      'a]{color:red}',
      'a"x',
      '',
      'x'.repeat(31),
    ]) {
      expect(cssDeTonos([{ ...AMARILLO, clave }]), clave).toBe('')
    }
  })

  it('descarta un tono con un color que no es #rrggbb, entero y sin escribir nada a medias', () => {
    const malos = ['red', '#fff', '#12345g', 'url(javascript:x)', '#ffffff;}body{display:none', '']
    for (const fondo of malos) {
      expect(cssDeTonos([{ ...AMARILLO, claro: { ...AMARILLO.claro, fondo } }]), fondo).toBe('')
    }
    expect(cssDeTonos([{ ...AMARILLO, oscuro: { ...AMARILLO.oscuro, tinta: 'x' } }])).toBe('')
  })

  it('un tono malo no tumba a los buenos', () => {
    const css = cssDeTonos([{ clave: 'MAL' }, AMARILLO, null, 5, 'texto'])
    expect(css).toContain('amarillo')
    expect(css).not.toContain('MAL')
  })

  it('sin tonos no escribe nada', () => {
    expect(cssDeTonos([])).toBe('')
  })
})

describe('EstiloDeTonos', () => {
  it('es un <style> con las reglas, sin comillas que el HTML tenga que escapar', () => {
    const html = renderToStaticMarkup(<EstiloDeTonos tonos={[AMARILLO]} />)
    expect(html).toMatch(/^<style>.*\[data-tono=amarillo\]\{/s)
    expect(html).not.toContain('&quot;')
    expect(html).not.toContain('&gt;')
  })

  it('sin tonos no dibuja nada', () => {
    expect(renderToStaticMarkup(<EstiloDeTonos tonos={[]} />)).toBe('')
  })
})
