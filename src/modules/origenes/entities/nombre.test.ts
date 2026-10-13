import { describe, expect, it } from 'vitest'
import {
  articulo,
  claveDeNombre,
  concordar,
  contados,
  frasePorVacio,
  generoSugerido,
  ninguno,
  pluralDe,
} from './nombre'

const CLAVE = /^[a-z][a-z0-9_]{1,30}$/

describe('claveDeNombre', () => {
  it('quita acentos, pasa a minúsculas y usa guion bajo', () => {
    expect(claveDeNombre('Corea del Sur')).toBe('corea_del_sur')
    expect(claveDeNombre('Japón')).toBe('japon')
    expect(claveDeNombre('  Subasta EE. UU.  ')).toBe('subasta_ee_uu')
  })

  it('empieza siempre con una letra', () => {
    expect(claveDeNombre('4x4 usados')).toBe('o_4x4_usados')
  })

  it('cabe en lo que acepta la base', () => {
    const larga = claveDeNombre('Importaciones directas desde los puertos del Pacífico Sur')
    expect(larga).toMatch(CLAVE)
    expect(larga.length).toBeLessThanOrEqual(31)
  })

  it('un nombre sin letras ni números cae a una clave válida', () => {
    expect(claveDeNombre('***')).toMatch(CLAVE)
    expect(claveDeNombre('A')).toMatch(CLAVE)
  })
})

describe('generoSugerido', () => {
  it.each([
    ['vehículo', 'm'],
    ['lote', 'm'],
    ['auto', 'm'],
    ['unidad', 'f'],
    ['camioneta', 'f'],
    ['moto', 'f'],
    ['día', 'm'],
    ['Unidad usada', 'f'],
  ] as const)('%s → %s', (sustantivo, genero) => {
    expect(generoSugerido(sustantivo)).toBe(genero)
  })
})

describe('pluralDe', () => {
  it.each([
    ['vehículo', 'vehículos'],
    ['unidad', 'unidades'],
    ['lote', 'lotes'],
    ['camión', 'camiones'],
    ['jardín', 'jardines'],
    ['moto', 'motos'],
    ['lápiz', 'lápices'],
    ['bus', 'bus'],
    ['unidad usada', 'unidades usadas'],
  ])('%s → %s', (singular, plural) => {
    expect(pluralDe(singular)).toBe(plural)
  })
})

describe('contados', () => {
  it('uno va en singular y el resto en plural', () => {
    expect(contados(1, 'lote')).toBe('1 lote')
    expect(contados(0, 'lote')).toBe('0 lotes')
    expect(contados(12, 'unidad')).toBe('12 unidades')
  })
})

describe('concordancia', () => {
  it('elige la forma del género', () => {
    expect(concordar('f', { m: 'nuevo', f: 'nueva' })).toBe('nueva')
    expect(articulo('m')).toBe('el')
    expect(articulo('f')).toBe('la')
    expect(ninguno('f')).toBe('ninguna')
  })

  it('arma el vacío con el nombre y el sustantivo del origen', () => {
    expect(frasePorVacio({ nombre: 'Corea', sustantivo: 'unidad', genero: 'f' })).toBe(
      'ninguna unidad en Corea todavía',
    )
  })

  it('con el formulario a medias usa algo legible', () => {
    expect(frasePorVacio({ nombre: ' ', sustantivo: '', genero: 'm' })).toBe(
      'ningún vehículo en este origen todavía',
    )
  })
})
