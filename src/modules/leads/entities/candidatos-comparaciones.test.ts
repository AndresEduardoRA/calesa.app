import { describe, expect, it } from 'vitest'
import {
  candidatosDesde,
  condicionesDeLaPagina,
  cuentaPorCandidatos,
  filtrosDeCandidatos,
  usaCandidatos,
} from './candidatos'
import type { CondicionDeLead } from './filtros'

// El texto y el rango de un campo, público y privado, por los candidatos (4.03, 5a-9 y 5a-34).
const ID_A = '5a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'

const textoPublico: CondicionDeLead = {
  tipo: 'atributo_texto',
  clave: 'ciudad',
  texto: 'cruz',
  columna: 'atributos_publicos',
}
const textoPrivado: CondicionDeLead = {
  tipo: 'atributo_texto',
  clave: 'direccion',
  texto: 'calle',
  columna: 'atributos',
}
const rangoNumeroPublico: CondicionDeLead = {
  tipo: 'atributo_rango_numero',
  clave: 'edad',
  min: 30,
  max: null,
  columna: 'atributos_publicos',
}
const rangoNumeroPrivado: CondicionDeLead = {
  tipo: 'atributo_rango_numero',
  clave: 'ingreso',
  min: null,
  max: 900,
  columna: 'atributos',
}
const rangoFechaPublico: CondicionDeLead = {
  tipo: 'atributo_rango_texto',
  clave: 'llegada',
  desde: '2026-10-01',
  antesDe: '2026-11-01',
  columna: 'atributos_publicos',
}
const rangoFechaPrivado: CondicionDeLead = {
  tipo: 'atributo_rango_texto',
  clave: 'nacio',
  desde: null,
  antesDe: '2000-01-01',
  columna: 'atributos',
}
const PUBLICAS = [textoPublico, rangoNumeroPublico, rangoFechaPublico]
const PRIVADAS = [textoPrivado, rangoNumeroPrivado, rangoFechaPrivado]

describe('usaCandidatos: un texto o un rango de un campo', () => {
  it('el privado siempre los pide, y el público también cuando se lee con el tope (el listado)', () => {
    for (const condicion of PRIVADAS) {
      expect(usaCandidatos([condicion]), condicion.tipo).toBe(true)
      expect(usaCandidatos([condicion], false), condicion.tipo).toBe(true)
    }
    for (const condicion of PUBLICAS) {
      expect(usaCandidatos([condicion]), condicion.tipo).toBe(true)
      expect(usaCandidatos([condicion], true), condicion.tipo).toBe(true)
    }
  })

  it('sin el tope (una exportación quiere todo) un campo público se lee de la vista: no los pide', () => {
    for (const condicion of PUBLICAS) {
      expect(usaCandidatos([condicion], false), condicion.tipo).toBe(false)
    }
  })
})

describe('filtrosDeCandidatos: un texto o un rango de un campo', () => {
  it('el público va a `comparaciones` y el privado a `comparaciones_privadas`, cada tipo con su forma', () => {
    const filtros = filtrosDeCandidatos([...PUBLICAS, ...PRIVADAS], null, 'siguiente')
    expect(filtros.comparaciones).toEqual([
      { tipo: 'texto', clave: 'ciudad', texto: 'cruz' },
      { tipo: 'rango_numero', clave: 'edad', min: 30 },
      { tipo: 'rango_texto', clave: 'llegada', desde: '2026-10-01', antes_de: '2026-11-01' },
    ])
    expect(filtros.comparaciones_privadas).toEqual([
      { tipo: 'texto', clave: 'direccion', texto: 'calle' },
      { tipo: 'rango_numero', clave: 'ingreso', max: 900 },
      { tipo: 'rango_texto', clave: 'nacio', antes_de: '2000-01-01' },
    ])
    expect(Object.keys(filtros).sort()).toEqual([
      'comparaciones',
      'comparaciones_privadas',
      'sentido',
    ])
  })

  it('un límite que falta no viaja (la base lo ignoraría, y un nulo no es un número)', () => {
    const [numero] =
      filtrosDeCandidatos([rangoNumeroPublico], null, 'siguiente').comparaciones ?? []
    expect(numero).toEqual({ tipo: 'rango_numero', clave: 'edad', min: 30 })
    expect(numero && 'max' in numero).toBe(false)
  })

  it('un rango con los dos límites lleva los dos', () => {
    const entre: CondicionDeLead = { ...rangoNumeroPublico, min: 10, max: 20 }
    expect(filtrosDeCandidatos([entre], null, 'siguiente').comparaciones).toEqual([
      { tipo: 'rango_numero', clave: 'edad', min: 10, max: 20 },
    ])
  })

  it('sin el tope sólo viaja el privado: el público lo lee la página', () => {
    const filtros = filtrosDeCandidatos([...PUBLICAS, ...PRIVADAS], null, 'siguiente', false)
    expect(filtros.comparaciones).toBeUndefined()
    expect(filtros.comparaciones_privadas).toHaveLength(3)
  })

  it('no lleva ninguna de las dos listas si no hay comparaciones', () => {
    const filtros = filtrosDeCandidatos([{ tipo: 'tachado', valor: false }], null, 'siguiente')
    expect(filtros).toEqual({ sentido: 'siguiente' })
  })
})

describe('condicionesDeLaPagina: un texto o un rango de un campo', () => {
  const marca: CondicionDeLead = { tipo: 'tachado', valor: false }

  it('con el tope los candidatos ya los cumplen, públicos y privados: la página no los repite', () => {
    expect(condicionesDeLaPagina([...PUBLICAS, ...PRIVADAS, marca])).toEqual([marca])
  })

  it('sin el tope la página repite los públicos y sólo los privados quedan cumplidos', () => {
    expect(condicionesDeLaPagina([...PUBLICAS, ...PRIVADAS, marca], false)).toEqual([
      ...PUBLICAS,
      marca,
    ])
  })
})

describe('candidatosDesde: el tope', () => {
  it('lee `acotada` y `recorridos`, que sólo vienen cuando la ventana se quedó en el tope', () => {
    const hasta = { creado_en: '2026-09-04T07:27:33.147629+00:00', id: ID_A }
    expect(
      candidatosDesde({ ids: [], completa: false, hasta, acotada: true, recorridos: 10000 }),
    ).toEqual({ ids: [], completa: false, hasta, acotada: true, recorridos: 10000 })
    expect(candidatosDesde({ ids: [], completa: true, hasta: null })?.acotada).toBeUndefined()
  })

  it('un `acotada` que no es un booleano rompe la forma: nunca «no hay más»', () => {
    expect(candidatosDesde({ ids: [], completa: false, hasta: null, acotada: 'si' })).toBeNull()
    expect(
      candidatosDesde({ ids: [], completa: false, hasta: null, recorridos: 'muchos' }),
    ).toBeNull()
  })
})

describe('los tachados de quien llama (4.03, 5a-34)', () => {
  const tachados: CondicionDeLead = { tipo: 'tachado', valor: true }
  const ocultos: CondicionDeLead = { tipo: 'tachado', valor: false }

  it('«sólo los tachados» viaja como `tachados: true`; «los que no» no acota y no viaja', () => {
    expect(filtrosDeCandidatos([textoPrivado, tachados], null, 'siguiente').tachados).toBe(true)
    expect(filtrosDeCandidatos([textoPrivado, ocultos], null, 'siguiente').tachados).toBeUndefined()
  })

  it('no pide candidatos por sí solo: acelera los que ya los piden', () => {
    expect(usaCandidatos([tachados])).toBe(false)
    expect(usaCandidatos([ocultos])).toBe(false)
    expect(usaCandidatos([tachados, textoPrivado])).toBe(true)
  })

  it('la página sigue aplicando la marca', () => {
    expect(condicionesDeLaPagina([tachados, textoPrivado])).toEqual([tachados])
  })
})

describe('cuentaPorCandidatos: el conteo sólo cambia de ruta con un campo privado', () => {
  const opcionPrivada: CondicionDeLead = {
    tipo: 'atributos_contienen',
    alternativas: [{ direccion: 'x' }],
    columna: 'atributos',
  }
  const opcionPublica: CondicionDeLead = {
    tipo: 'atributos_contienen',
    alternativas: [{ ciudad: 'lp' }],
    columna: 'atributos_publicos',
  }

  it('un privado, de opciones, texto o rango, lo cuenta por los candidatos', () => {
    for (const condicion of [opcionPrivada, ...PRIVADAS]) {
      expect(cuentaPorCandidatos([condicion]), condicion.tipo).toBe(true)
      expect(cuentaPorCandidatos([{ tipo: 'tachado', valor: true }, condicion])).toBe(true)
    }
  })

  it('sin un privado la vista ya es barata: lo público, las marcas y nada se quedan en ella', () => {
    expect(cuentaPorCandidatos([])).toBe(false)
    expect(cuentaPorCandidatos([opcionPublica, ...PUBLICAS])).toBe(false)
    expect(cuentaPorCandidatos([{ tipo: 'tachado', valor: true }])).toBe(false)
    expect(cuentaPorCandidatos([{ tipo: 'etiquetas', ids: [ID_A] }])).toBe(false)
  })
})
