import { describe, expect, it } from 'vitest'
import { esClicPropio } from './clic-de-fila'

function fila(html: string) {
  const raiz = document.createElement('div')
  raiz.innerHTML = html
  document.body.append(raiz)
  return raiz
}

describe('esClicPropio', () => {
  const html = `
    <div id="fila">
      <button data-abre-resumen><span id="nombre">Ana</span></button>
      <span id="texto">Teléfono</span>
      <input id="casilla" type="checkbox" />
      <a id="enlace" href="https://x.test"><b id="dentro-del-enlace">Abrir enlace</b></a>
      <button id="mas"><i id="icono"></i></button>
      <div role="menuitem" id="item"></div>
      <div data-no-abre><p id="excluido">no abre</p></div>
    </div>`

  it('un clic en el texto de la fila abre', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    expect(esClicPropio({ target: raiz.querySelector('#texto'), currentTarget: f })).toBe(false)
    expect(esClicPropio({ target: f, currentTarget: f })).toBe(false)
  })

  it('el botón del nombre abre, también si se pulsa lo de adentro', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    expect(esClicPropio({ target: raiz.querySelector('#nombre'), currentTarget: f })).toBe(false)
  })

  it('la casilla, el enlace (y lo de adentro), el «⋯», un ítem de menú y lo marcado no abren', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    for (const id of [
      'casilla',
      'enlace',
      'dentro-del-enlace',
      'mas',
      'icono',
      'item',
      'excluido',
    ]) {
      expect(esClicPropio({ target: raiz.querySelector(`#${id}`), currentTarget: f }), id).toBe(
        true,
      )
    }
  })

  it('lo que llega desde un portal (fuera de la fila en el DOM) no abre', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    const portal = document.createElement('div')
    document.body.append(portal)
    expect(esClicPropio({ target: portal, currentTarget: f })).toBe(true)
  })

  it('un destino que no es un elemento no se trata como propio', () => {
    const raiz = fila(html)
    expect(esClicPropio({ target: null, currentTarget: raiz.querySelector('#fila')! })).toBe(false)
  })
})
