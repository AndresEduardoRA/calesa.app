import { describe, expect, it } from 'vitest'
import { esquemaPreferencia, preferenciasDesde } from './preferencias'

describe('preferenciasDesde', () => {
  it('lee lo que la persona eligió', () => {
    expect(
      preferenciasDesde({ densidad: 'comoda', tema: 'dark', 'listas.por_pagina': 25 }),
    ).toEqual({
      densidad: 'comoda',
      tema: 'dark',
      porPagina: 25,
    })
  })

  it('sin elección, todo queda en automático', () => {
    expect(preferenciasDesde({})).toEqual({ densidad: null, tema: null, porPagina: null })
    expect(preferenciasDesde(null)).toEqual({ densidad: null, tema: null, porPagina: null })
  })

  it('un valor desconocido no rompe: esa preferencia queda sin elegir', () => {
    expect(preferenciasDesde({ densidad: 'enorme', tema: 'dark', tablero: { a: 1 } })).toEqual({
      densidad: null,
      tema: 'dark',
      porPagina: null,
    })
  })

  it('«ítems por página» sólo vale con uno de los cuatro tamaños, como número', () => {
    for (const bueno of [10, 25, 50, 100]) {
      expect(preferenciasDesde({ 'listas.por_pagina': bueno }).porPagina).toBe(bueno)
    }
    for (const malo of [7, 0, -1, 1000, '50', '"50"', null, true, {}, [50], 50.5, NaN]) {
      expect(preferenciasDesde({ 'listas.por_pagina': malo }).porPagina).toBeNull()
    }
  })

  it('una persona sin fila de esa preferencia queda sin elegir (manda el tamaño de fábrica)', () => {
    expect(preferenciasDesde({ densidad: 'compacta' }).porPagina).toBeNull()
  })
})

describe('esquemaPreferencia', () => {
  it('acepta cada clave con sus valores y null para borrarla', () => {
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: 'compacta' }).success).toBe(
      true,
    )
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: null }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'tema', valor: 'system' }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'listas.por_pagina', valor: 100 }).success).toBe(
      true,
    )
    expect(esquemaPreferencia.safeParse({ clave: 'listas.por_pagina', valor: null }).success).toBe(
      true,
    )
  })

  it('rechaza un tamaño que el selector no ofrece, antes de llegar a la base', () => {
    for (const valor of [7, 0, -10, 101, 1000, '50', 25.5]) {
      expect(esquemaPreferencia.safeParse({ clave: 'listas.por_pagina', valor }).success).toBe(
        false,
      )
    }
  })

  it('rechaza un valor de otra clave o una clave que no existe', () => {
    expect(esquemaPreferencia.safeParse({ clave: 'densidad', valor: 'dark' }).success).toBe(false)
    expect(esquemaPreferencia.safeParse({ clave: 'idioma', valor: 'es' }).success).toBe(false)
  })
})
