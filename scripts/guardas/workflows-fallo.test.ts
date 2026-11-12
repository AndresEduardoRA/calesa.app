import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GUION_DEL_VOLCADO, problemasDelPasoDeFallo } from './workflows-fallo'

// 9-11: el e2e que cae en CI deja el rastro de la base en su artefacto. Las mutaciones se hacen sobre el texto leído del repo.
const CI = '.github/workflows/ci.yml'
const ci = readFileSync(CI, 'utf8')
const guion = readFileSync(GUION_DEL_VOLCADO, 'utf8')

function mutar(texto: string, antes: string | RegExp, despues: string): string {
  const mutado = texto.replace(antes, despues)
  expect(mutado, `la mutación no encontró ${String(antes)}`).not.toBe(texto)
  return mutado
}

describe('el paso de fallo del e2e', () => {
  it('ci.yml y el guion cumplen', () => {
    expect(problemasDelPasoDeFallo(ci, CI, guion)).toEqual([])
  })

  it('un workflow sin e2e no tiene nada que volcar', () => {
    const sinE2e = 'jobs:\n  a:\n    steps:\n      - run: echo hola\n'
    expect(problemasDelPasoDeFallo(sinE2e, 'x.yml', '')).toEqual([])
  })

  it('cae sin la llamada al guion', () => {
    const mutado = mutar(ci, /^.*volcar-base\.sh.*$/m, '          echo sin volcado')
    expect(problemasDelPasoDeFallo(mutado, CI, guion).join('\n')).toContain(
      'no vuelca la base al caer',
    )
  })

  it('cae si el volcado no va a e2e-fallos', () => {
    const mutado = mutar(ci, /volcar-base\.sh e2e-fallos/, 'volcar-base.sh otra-carpeta')
    expect(problemasDelPasoDeFallo(mutado, CI, guion).join('\n')).toContain('carpeta e2e-fallos')
  })

  it('cae si el artefacto no incluye e2e-fallos/', () => {
    const mutado = mutar(ci, /^\s*e2e-fallos\/\s*$/m, '')
    expect(problemasDelPasoDeFallo(mutado, CI, guion).join('\n')).toContain(
      'no incluye e2e-fallos/',
    )
  })

  it('cae si al guion le falta un archivo', () => {
    const mutado = mutar(guion, /pg_stat_checkpointer\.txt/g, 'otro.txt')
    expect(problemasDelPasoDeFallo(ci, CI, mutado)).toEqual([
      `${GUION_DEL_VOLCADO}: no deja pg_stat_checkpointer.txt`,
    ])
  })

  it('cae si el paso del volcado no es «if: failure()»', () => {
    const mutado = mutar(
      ci,
      /(- name: el log de las funciones y de la base[^\n]*\n\s*)if: failure\(\)/,
      '$1if: always()',
    )
    expect(problemasDelPasoDeFallo(mutado, CI, guion).join('\n')).toContain(
      'no vuelca la base al caer',
    )
  })
})
