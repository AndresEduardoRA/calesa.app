import { describe, expect, it } from 'vitest'
import {
  CLAVE_DE_VERSION,
  PANEL_REVERTIR_FORMULA,
  motivoParaNoAbrirRevertir,
  notaDeRevertir,
  versionParaRevertir,
} from './reversion'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const fila = (n: number, estado: 'publicada' | 'archivada') => ({ id: id(n), version: n, estado })

// La página del servidor: la publicada 3 y las archivadas 2 y 1.
const delServidor = [fila(3, 'publicada'), fila(2, 'archivada'), fila(1, 'archivada')]

describe('notaDeRevertir', () => {
  it('la nota escrita de antemano', () => {
    expect(notaDeRevertir(3)).toBe('Vuelve a la versión 3.')
  })
})

describe('versionParaRevertir', () => {
  it('una archivada de la página del servidor', () => {
    expect(versionParaRevertir(id(2), { archivadas: delServidor, elegida: null })).toMatchObject({
      id: id(2),
      version: 2,
    })
  })

  it('la recién elegida, aunque no esté en la página del servidor (2.ª página)', () => {
    const elegida = { id: id(40), version: 40 }
    expect(versionParaRevertir(id(40), { archivadas: delServidor, elegida })).toEqual(elegida)
  })

  it('la publicada, otra o nada no son a cuál revertir', () => {
    expect(versionParaRevertir(id(3), { archivadas: delServidor, elegida: null })).toBeNull()
    expect(versionParaRevertir(id(99), { archivadas: delServidor, elegida: null })).toBeNull()
    expect(versionParaRevertir(null, { archivadas: delServidor, elegida: null })).toBeNull()
  })
})

describe('motivoParaNoAbrirRevertir (al llegar por la URL)', () => {
  const con = (elegida: { id: string; version: number } | null = null) => ({
    publicadaId: id(3),
    archivadas: delServidor,
    elegida,
  })

  it('sin publicada no hay a qué revertir', () => {
    expect(motivoParaNoAbrirRevertir(id(2), { ...con(), publicadaId: null })).toBe(
      'Sin una versión publicada no hay a qué revertir.',
    )
  })

  it('la publicada no se revierte', () => {
    expect(motivoParaNoAbrirRevertir(id(3), con())).toBe('Esa ya es la versión publicada.')
  })

  it('un id que no está en la lista, uno que no es guid o ninguno no abren', () => {
    const motivo = 'Esa versión no está en la lista: búscala y elige «Revertir».'
    expect(motivoParaNoAbrirRevertir(id(77), con())).toBe(motivo)
    expect(motivoParaNoAbrirRevertir('no-es-un-id', con())).toBe(motivo)
    expect(motivoParaNoAbrirRevertir(null, con())).toBe(motivo)
  })

  it('una archivada del servidor o la recién elegida de otra página abren', () => {
    expect(motivoParaNoAbrirRevertir(id(1), con())).toBeNull()
    expect(motivoParaNoAbrirRevertir(id(40), con({ id: id(40), version: 40 }))).toBeNull()
  })
})

describe('las claves', () => {
  it('el panel y la versión', () => {
    expect(PANEL_REVERTIR_FORMULA).toBe('revertir-formula')
    expect(CLAVE_DE_VERSION).toBe('version')
  })
})
