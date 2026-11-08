import { describe, expect, it } from 'vitest'
import { puedeBorrarComentario, puedeEditarComentario, puedeResponderComentario } from './permisos'

const propio = { mio: true, eliminado: false }
const ajeno = { mio: false, eliminado: false }
const propioEliminado = { mio: true, eliminado: true }
const ajenoEliminado = { mio: false, eliminado: true }

describe('puedeEditarComentario', () => {
  it('edita sólo quien lo escribió, mientras está vivo', () => {
    expect(puedeEditarComentario(propio)).toBe(true)
    expect(puedeEditarComentario(ajeno)).toBe(false)
    expect(puedeEditarComentario(propioEliminado)).toBe(false)
  })
})

describe('puedeBorrarComentario', () => {
  it('borra quien lo escribió, con o sin moderar', () => {
    expect(puedeBorrarComentario(propio, false)).toBe(true)
    expect(puedeBorrarComentario(propio, true)).toBe(true)
  })

  it('el ajeno, sólo quien modera', () => {
    expect(puedeBorrarComentario(ajeno, true)).toBe(true)
    expect(puedeBorrarComentario(ajeno, false)).toBe(false)
  })

  it('uno eliminado no se borra otra vez, ni con moderar', () => {
    expect(puedeBorrarComentario(propioEliminado, true)).toBe(false)
    expect(puedeBorrarComentario(ajenoEliminado, true)).toBe(false)
  })
})

describe('puedeResponderComentario', () => {
  it('se responde una raíz (también eliminada), nunca una respuesta', () => {
    expect(puedeResponderComentario(true)).toBe(true)
    expect(puedeResponderComentario(false)).toBe(false)
  })
})
