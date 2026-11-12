import { describe, expect, it } from 'vitest'
import { impactoDesde, resumenDeEliminacion, resumenDeImpacto } from './impacto'

const LEAD = { singular: 'lead', plural: 'leads' }
const CAMPO = {
  tipo: 'opcion',
  requerido: false,
  etiqueta: 'Signo',
  opciones: [
    { clave: 'aries', etiqueta: 'Aries' },
    { clave: 'leo', etiqueta: 'Leo' },
  ],
} as const
const IMPACTO = {
  total: 5,
  conValor: 3,
  sinValor: 2,
  porOpcion: { leo: 3, aries: 0 },
  fueraDeRango: null,
}

describe('impactoDesde', () => {
  it('lee lo que cuenta la base', () => {
    expect(impactoDesde({ total: 5, con_valor: 3, sin_valor: 2, por_opcion: { leo: 3 } })).toEqual({
      total: 5,
      conValor: 3,
      sinValor: 2,
      porOpcion: { leo: 3 },
      fueraDeRango: null,
    })
  })

  it('rechaza una forma que no es la esperada', () => {
    expect(() => impactoDesde({ total: 'cinco' })).toThrow()
  })
})

describe('resumenDeImpacto', () => {
  it('un cambio de tipo con datos bloquea y cuenta cuántos, con el sustantivo del módulo', () => {
    const resumen = resumenDeImpacto(CAMPO, { tipo: 'numero' }, IMPACTO, LEAD)
    expect(resumen.bloquea).toBe(true)
    expect(resumen.avisos[0]).toContain('3 leads ya tienen un valor en «Signo»')
  })

  it('un cambio de tipo sin datos no dice nada', () => {
    const resumen = resumenDeImpacto(CAMPO, { tipo: 'texto' }, { ...IMPACTO, conValor: 0 }, LEAD)
    expect(resumen).toEqual({ bloquea: false, avisos: [] })
  })

  it('volver requerido avisa cuántos quedan incompletos, sin bloquear', () => {
    const resumen = resumenDeImpacto(CAMPO, { requerido: true }, IMPACTO, LEAD)
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('2 leads no tienen este dato')
  })

  it('con uno solo concuerda en singular', () => {
    const resumen = resumenDeImpacto(CAMPO, { requerido: true }, { ...IMPACTO, sinValor: 1 }, LEAD)
    expect(resumen.avisos[0]).toContain('1 lead no tiene este dato')
  })

  it('sacar una opción en uso avisa con su etiqueta y no bloquea', () => {
    const resumen = resumenDeImpacto(
      CAMPO,
      { opciones: [{ clave: 'aries', etiqueta: 'Aries' }] },
      IMPACTO,
      LEAD,
    )
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('«Leo» (3 leads)')
    expect(resumen.avisos[0]).toContain('Hay leads con opciones que sacas')
  })

  it('sacar una opción que nadie usa no pregunta', () => {
    const resumen = resumenDeImpacto(
      CAMPO,
      { opciones: [{ clave: 'leo', etiqueta: 'Leo' }] },
      IMPACTO,
      LEAD,
    )
    expect(resumen.avisos).toEqual([])
  })
})

describe('resumenDeImpacto con rango', () => {
  const PUNTAJE = {
    tipo: 'numero',
    requerido: false,
    etiqueta: 'Puntaje',
    opciones: [],
    minimo: 1,
    maximo: 10,
  } as const
  const fuera = (n: number | null) => ({ ...IMPACTO, fueraDeRango: n })

  it('lee el conteo de fuera de rango; sin él, null', () => {
    expect(
      impactoDesde({ total: 1, con_valor: 1, sin_valor: 0, por_opcion: {} }).fueraDeRango,
    ).toBeNull()
    expect(
      impactoDesde({ total: 1, con_valor: 1, sin_valor: 0, por_opcion: {}, fuera_de_rango: 51 })
        .fueraDeRango,
    ).toBe(51)
  })

  it('bajar el máximo con uno fuera avisa en singular y no bloquea', () => {
    expect(resumenDeImpacto(PUNTAJE, { maximo: 5 }, fuera(1), LEAD)).toEqual({
      bloquea: false,
      avisos: [
        '1 lead tiene un valor fuera de este rango. Lo conserva; el rango rige cuando alguien cambie ese dato.',
      ],
    })
  })

  it('con varios, en plural; con el tope de la base, «más de 50»', () => {
    expect(resumenDeImpacto(PUNTAJE, { minimo: 3 }, fuera(7), LEAD).avisos[0]).toBe(
      '7 leads tienen un valor fuera de este rango. Lo conservan; el rango rige cuando alguien cambie ese dato.',
    )
    const tope = resumenDeImpacto(PUNTAJE, { maximo: 5 }, fuera(51), LEAD)
    expect(tope.avisos[0]).toMatch(/^Más de 50 leads tienen un valor fuera de este rango\./)
    expect(tope.bloquea).toBe(false)
  })

  it('sin nadie fuera, o si el rango no se acota, no dice nada', () => {
    expect(resumenDeImpacto(PUNTAJE, { maximo: 5 }, fuera(0), LEAD).avisos).toEqual([])
    expect(resumenDeImpacto(PUNTAJE, { maximo: 5 }, fuera(null), LEAD).avisos).toEqual([])
    expect(resumenDeImpacto(PUNTAJE, { maximo: 20 }, fuera(3), LEAD).avisos).toEqual([])
  })
})

describe('resumenDeEliminacion', () => {
  it('con datos bloquea y manda a desactivar', () => {
    const resumen = resumenDeEliminacion(
      CAMPO,
      { total: 5, conValor: 1, sinValor: 4, porOpcion: {}, fueraDeRango: null },
      LEAD,
    )
    expect(resumen.bloquea).toBe(true)
    expect(resumen.avisos[0]).toContain('1 lead tiene un valor en «Signo»')
  })

  it('sin datos avisa que no se deshace', () => {
    const resumen = resumenDeEliminacion(
      CAMPO,
      { total: 5, conValor: 0, sinValor: 5, porOpcion: {}, fueraDeRango: null },
      LEAD,
    )
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('Ningún lead usa «Signo»')
    expect(resumen.avisos[0]).toContain('no se puede deshacer')
  })
})
