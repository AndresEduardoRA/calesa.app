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
      widgetsDelTablero: null,
      zonaHoraria: null,
    })
  })

  it('sin elección, todo queda en automático', () => {
    const sinElegir = {
      densidad: null,
      tema: null,
      porPagina: null,
      widgetsDelTablero: null,
      zonaHoraria: null,
    }
    expect(preferenciasDesde({})).toEqual(sinElegir)
    expect(preferenciasDesde(null)).toEqual(sinElegir)
  })

  it('un valor desconocido no rompe: esa preferencia queda sin elegir', () => {
    expect(preferenciasDesde({ densidad: 'enorme', tema: 'dark', tablero: { a: 1 } })).toEqual({
      densidad: null,
      tema: 'dark',
      porPagina: null,
      widgetsDelTablero: null,
      zonaHoraria: null,
    })
  })

  it('«tablero.widgets» se lee si tiene la forma y, si no, queda sin elegir sin dañar lo demás', () => {
    const valida = { orden: ['a', 'b'], ocultos: ['b'] }
    expect(preferenciasDesde({ 'tablero.widgets': valida }).widgetsDelTablero).toEqual(valida)
    // Las claves de más dentro del objeto se descartan.
    expect(
      preferenciasDesde({ 'tablero.widgets': { ...valida, otra: 1 } }).widgetsDelTablero,
    ).toEqual(valida)
    const malos = [
      null,
      'texto',
      7,
      { orden: 'a' },
      { orden: ['a'] },
      { orden: Array(61).fill('a'), ocultos: [] },
    ]
    for (const malo of malos) {
      const leidas = preferenciasDesde({ tema: 'dark', 'tablero.widgets': malo })
      expect(leidas.widgetsDelTablero).toBeNull()
      expect(leidas.tema).toBe('dark')
    }
    expect(preferenciasDesde({ tema: 'dark' }).widgetsDelTablero).toBeNull()
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

describe('esquemaPreferencia de «tablero.widgets»', () => {
  it('acepta una disposición válida y null para restablecerla', () => {
    const valor = { orden: ['a', 'b'], ocultos: ['a'] }
    expect(esquemaPreferencia.safeParse({ clave: 'tablero.widgets', valor }).success).toBe(true)
    expect(esquemaPreferencia.safeParse({ clave: 'tablero.widgets', valor: null }).success).toBe(
      true,
    )
  })

  it('rechaza lo malformado antes de llegar a la base', () => {
    const malos = [
      { orden: [1], ocultos: [] },
      { orden: ['x'.repeat(61)], ocultos: [] },
      { orden: [], ocultos: Array(61).fill('a') },
      { orden: [] },
      'texto',
    ]
    for (const valor of malos) {
      expect(esquemaPreferencia.safeParse({ clave: 'tablero.widgets', valor }).success).toBe(false)
    }
  })
  it('la zona horaria sólo si Intl la conoce', () => {
    expect(preferenciasDesde({ zona_horaria: 'America/New_York' }).zonaHoraria).toBe(
      'America/New_York',
    )
    expect(preferenciasDesde({ zona_horaria: 'Marte/Olimpo' }).zonaHoraria).toBeNull()
  })
})
