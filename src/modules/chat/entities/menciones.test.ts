import { describe, expect, it } from 'vitest'
import {
  claveDeReferencia,
  MAXIMO_DE_MENCIONES,
  mencionesDelCuerpo,
  partirCuerpo,
  referenciaDeUrl,
} from './menciones'

const LEAD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const VEHICULO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

describe('partirCuerpo', () => {
  it('conserva el texto y devuelve las menciones en orden', () => {
    const cuerpo = `Revisa #[lead:${LEAD}] y también #[vehiculo:${VEHICULO}] hoy\nGracias`
    const trozos = partirCuerpo(cuerpo)
    expect(trozos).toEqual([
      { tipo: 'texto', texto: 'Revisa ' },
      { tipo: 'mencion', clase: 'lead', id: LEAD, token: `#[lead:${LEAD}]` },
      { tipo: 'texto', texto: ' y también ' },
      { tipo: 'mencion', clase: 'vehiculo', id: VEHICULO, token: `#[vehiculo:${VEHICULO}]` },
      { tipo: 'texto', texto: ' hoy\nGracias' },
    ])
    const rearmado = trozos.map((t) => (t.tipo === 'texto' ? t.texto : t.token)).join('')
    expect(rearmado).toBe(cuerpo)
  })

  it.each([
    ['un # suelto', 'hola #1 y # nada'],
    ['un token sin uuid', '#[lead:xx]'],
    ['un tipo desconocido', `#[tarea:${LEAD}]`],
    ['un uuid corto', '#[lead:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa]'],
    ['sin cerrar', `#[lead:${LEAD}`],
  ])('deja %s como texto', (_nombre, cuerpo) => {
    expect(partirCuerpo(cuerpo)).toEqual([{ tipo: 'texto', texto: cuerpo }])
  })

  it('un cuerpo vacío no tiene trozos', () => {
    expect(partirCuerpo('')).toEqual([])
  })

  it('normaliza a minúsculas el uuid con letras A-F, como la base', () => {
    const mayusculas = LEAD.toUpperCase()
    const [trozo] = partirCuerpo(`#[lead:${mayusculas}]`)
    expect(trozo).toMatchObject({ tipo: 'mencion', clase: 'lead', id: LEAD })
  })
})

describe('mencionesDelCuerpo', () => {
  it('deduplica por clase e id, en orden de aparición', () => {
    const cuerpo = `#[lead:${LEAD}] #[vehiculo:${VEHICULO}] #[lead:${LEAD.toUpperCase()}] #[usuario:${LEAD}]`
    expect(mencionesDelCuerpo(cuerpo)).toEqual([
      { clase: 'lead', id: LEAD },
      { clase: 'vehiculo', id: VEHICULO },
      { clase: 'usuario', id: LEAD },
    ])
  })

  it('corta en el máximo de menciones', () => {
    const cuerpo = Array.from({ length: 25 }, (_, i) => `#[lead:${uuid(i)}]`).join(' ')
    const referencias = mencionesDelCuerpo(cuerpo)
    expect(referencias).toHaveLength(MAXIMO_DE_MENCIONES)
    expect(referencias[0]).toEqual({ clase: 'lead', id: uuid(0) })
  })

  it('sin menciones no hay referencias', () => {
    expect(mencionesDelCuerpo('nada que ver')).toEqual([])
  })
})

describe('referenciaDeUrl', () => {
  it('lee clase:id y devuelve la referencia', () => {
    expect(referenciaDeUrl(`lead:${LEAD}`)).toEqual({ clase: 'lead', id: LEAD })
    expect(claveDeReferencia({ clase: 'lead', id: LEAD })).toBe(`lead:${LEAD}`)
  })

  it.each([null, '', 'lead', 'lead:xx', `tarea:${LEAD}`, `lead:${LEAD}] #[lead:${LEAD}`])(
    'un valor ilegible (%s) no es una referencia',
    (valor) => {
      expect(referenciaDeUrl(valor)).toBeNull()
    },
  )
})
