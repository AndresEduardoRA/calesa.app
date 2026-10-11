import { describe, expect, it } from 'vitest'
import { esquemaPreferencia, preferenciasDesde } from './preferencias'

describe('preferenciasDesde', () => {
  it('lee lo que la persona eligió', () => {
    expect(preferenciasDesde({ densidad: 'comoda', tema: 'dark' })).toEqual({
      densidad: 'comoda',
      tema: 'dark',
    })
  })

  it('sin elección, todo queda en automático', () => {
    expect(preferenciasDesde({})).toEqual({ densidad: null, tema: null })
    expect(preferenciasDesde(null)).toEqual({ densidad: null, tema: null })
  })

  it('un valor desconocido no rompe: esa preferencia queda sin elegir', () => {
    expect(preferenciasDesde({ densidad: 'enorme', tema: 'dark', tablero: { a: 1 } })).toEqual({
      densidad: null,
      tema: 'dark',
    })
  })
})

describe('esquemaPreferencia', () => {
  it('acepta cada clave con sus valores y null para borrarla', () => {
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: 'compacta' }).success).toBe(
      true,
    )
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: null }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'tema', valor: 'system' }).success).toBe(true)
  })

  it('rechaza un valor de otra clave o una clave que no existe', () => {
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: 'dark' }).success).toBe(false)
    expect(esquemaPreferencia.safeParse({ clave: 'idioma', valor: 'es' }).success).toBe(false)
  })
})
