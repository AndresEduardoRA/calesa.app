import { describe, expect, it } from 'vitest'
import { ramasPorBorrar } from './limpiar-ramas.mjs'

// `limpiar-ramas.mjs` borra sólo lo que ya está en main: la rama de un PR integrado (con su punta, o detrás de ella) o una cuya punta
// es un ancestro de `origin/main`. Nunca una protegida, una con un PR abierto ni una que avanzó después de integrarse.
const pr = (headRefName: string, headRefOid: string, state: string) => ({
  headRefName,
  headRefOid,
  state,
})
const PROTEGIDAS = new Set(['main', 'feat/en-un-worktree'])

describe('limpiar-ramas › qué ramas se borran', () => {
  it('borra la rama de un PR integrado cuya punta es la que se integró', () => {
    expect(
      ramasPorBorrar([{ nombre: 'fix/x', sha: 'a1' }], [pr('fix/x', 'a1', 'MERGED')], PROTEGIDAS),
    ).toEqual(['fix/x'])
  })

  it('borra la rama local que quedó detrás de lo que se integró', () => {
    const esAncestro = (a: string, b: string) => a === 'a0' && b === 'a1'
    expect(
      ramasPorBorrar(
        [{ nombre: 'fix/x', sha: 'a0' }],
        [pr('fix/x', 'a1', 'MERGED')],
        PROTEGIDAS,
        esAncestro,
      ),
    ).toEqual(['fix/x'])
  })

  it('deja la rama que avanzó después de integrarse (tiene commits que no están en main)', () => {
    expect(
      ramasPorBorrar([{ nombre: 'fix/x', sha: 'a2' }], [pr('fix/x', 'a1', 'MERGED')], PROTEGIDAS),
    ).toEqual([])
  })

  it('deja la rama con un PR abierto, aunque otro anterior se haya integrado', () => {
    expect(
      ramasPorBorrar(
        [{ nombre: 'feat/y', sha: 'b1' }],
        [pr('feat/y', 'b1', 'MERGED'), pr('feat/y', 'b2', 'OPEN')],
        PROTEGIDAS,
      ),
    ).toEqual([])
  })

  it('deja main y la rama de un worktree', () => {
    expect(
      ramasPorBorrar(
        [
          { nombre: 'main', sha: 'm1' },
          { nombre: 'feat/en-un-worktree', sha: 'c1' },
        ],
        [pr('feat/en-un-worktree', 'c1', 'MERGED')],
        PROTEGIDAS,
        () => true,
        'm1',
      ),
    ).toEqual([])
  })
})

describe('limpiar-ramas › ramas que siguieron después de integrarse o que nunca tuvieron PR', () => {
  it('borra la rama que no aporta nada sobre su ancestro común con main, aunque su punta no esté en main', () => {
    expect(
      ramasPorBorrar(
        [
          { nombre: 'trajo-main', sha: 'f1' },
          { nombre: 'con-trabajo', sha: 'g1' },
        ],
        [],
        PROTEGIDAS,
        () => false,
        'm1',
        (sha: string) => sha === 'f1',
      ),
    ).toEqual(['trajo-main'])
  })

  it('borra la rama que siguió tras integrarse sólo trayendo main, y deja la que sumó trabajo propio', () => {
    const soloTrajoMain = (sha: string, integrada: string) => sha === 'h2' && integrada === 'h1'
    expect(
      ramasPorBorrar(
        [
          { nombre: 'fix/trajo-main', sha: 'h2' },
          { nombre: 'fix/siguio', sha: 'i2' },
        ],
        [pr('fix/trajo-main', 'h1', 'MERGED'), pr('fix/siguio', 'i1', 'MERGED')],
        PROTEGIDAS,
        () => false,
        'm1',
        () => false,
        soloTrajoMain,
      ),
    ).toEqual(['fix/trajo-main'])
  })

  it('borra una rama sin PR cuya punta ya está en main, y deja la que no', () => {
    const esAncestro = (a: string, b: string) => a === 'd1' && b === 'm1'
    expect(
      ramasPorBorrar(
        [
          { nombre: 'vieja', sha: 'd1' },
          { nombre: 'sin-integrar', sha: 'e1' },
        ],
        [pr('sin-integrar', 'e1', 'CLOSED')],
        PROTEGIDAS,
        esAncestro,
        'm1',
      ),
    ).toEqual(['vieja'])
  })
})
