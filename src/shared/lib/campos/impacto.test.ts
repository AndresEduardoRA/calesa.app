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
const IMPACTO = { total: 5, conValor: 3, sinValor: 2, porOpcion: { leo: 3, aries: 0 } }

describe('impactoDesde', () => {
  it('lee lo que cuenta la base', () => {
    expect(impactoDesde({ total: 5, con_valor: 3, sin_valor: 2, por_opcion: { leo: 3 } })).toEqual({
      total: 5,
      conValor: 3,
      sinValor: 2,
      porOpcion: { leo: 3 },
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

describe('resumenDeEliminacion', () => {
  it('con datos bloquea y manda a desactivar', () => {
    const resumen = resumenDeEliminacion(
      CAMPO,
      { total: 5, conValor: 1, sinValor: 4, porOpcion: {} },
      LEAD,
    )
    expect(resumen.bloquea).toBe(true)
    expect(resumen.avisos[0]).toContain('1 lead tiene un valor en «Signo»')
  })

  it('sin datos avisa que no se deshace', () => {
    const resumen = resumenDeEliminacion(
      CAMPO,
      { total: 5, conValor: 0, sinValor: 5, porOpcion: {} },
      LEAD,
    )
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('Ningún lead usa «Signo»')
    expect(resumen.avisos[0]).toContain('no se puede deshacer')
  })
})
