import { describe, expect, it } from 'vitest'
import { camposDesde, type CampoDeLayout } from './campo'
import { impactoDesde, resumenDeEliminacion, resumenDeImpacto } from './impacto'

const [CAMPO] = camposDesde([
  {
    id: '00000000-0000-0000-0000-000000000001',
    origen_id: '00000000-0000-0000-0000-0000000000aa',
    clave: 'kit',
    etiqueta: 'Kit',
    tipo: 'opcion',
    opciones: [
      { clave: 'basico', etiqueta: 'Básico' },
      { clave: 'full', etiqueta: 'Full' },
    ],
    requerido: false,
    grupo: null,
    orden: 10,
    en_tarjeta: false,
    filtrable: false,
    publico_web: false,
    clave_apibara: null,
    es_sistema: false,
    activo: true,
    actualizado_en: '2026-10-12T20:00:00+00:00',
  },
])
const campo = CAMPO as CampoDeLayout

describe('impactoDesde', () => {
  it('lee lo que cuenta la base', () => {
    expect(impactoDesde({ total: 5, con_valor: 3, sin_valor: 2, por_opcion: { full: 3 } })).toEqual(
      { total: 5, conValor: 3, sinValor: 2, porOpcion: { full: 3 } },
    )
  })

  it('rechaza una forma que no es la esperada', () => {
    expect(() => impactoDesde({ total: 'cinco' })).toThrow()
  })
})

describe('resumenDeImpacto', () => {
  const impacto = { total: 5, conValor: 3, sinValor: 2, porOpcion: { full: 3, basico: 0 } }

  it('un cambio de tipo con datos bloquea y cuenta cuántos', () => {
    const resumen = resumenDeImpacto(campo, { tipo: 'numero' }, impacto)
    expect(resumen.bloquea).toBe(true)
    expect(resumen.avisos[0]).toContain('3 vehículos ya tienen un valor en «Kit»')
  })

  it('un cambio de tipo sin datos no dice nada', () => {
    const resumen = resumenDeImpacto(campo, { tipo: 'texto' }, { ...impacto, conValor: 0 })
    expect(resumen).toEqual({ bloquea: false, avisos: [] })
  })

  it('volver requerido avisa cuántos quedan incompletos, sin bloquear', () => {
    const resumen = resumenDeImpacto(campo, { requerido: true }, impacto)
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('2 vehículos no tienen este dato')
  })

  it('con uno solo concuerda en singular', () => {
    const resumen = resumenDeImpacto(campo, { requerido: true }, { ...impacto, sinValor: 1 })
    expect(resumen.avisos[0]).toContain('1 vehículo no tiene este dato')
  })

  it('sacar una opción en uso avisa con su etiqueta y no bloquea', () => {
    const resumen = resumenDeImpacto(
      campo,
      { opciones: [{ clave: 'basico', etiqueta: 'Básico' }] },
      impacto,
    )
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('«Full» (3 vehículos)')
  })

  it('sacar una opción que nadie usa no pregunta', () => {
    const resumen = resumenDeImpacto(
      campo,
      { opciones: [{ clave: 'full', etiqueta: 'Full' }] },
      impacto,
    )
    expect(resumen.avisos).toEqual([])
  })
})

describe('resumenDeEliminacion', () => {
  it('con datos bloquea y manda a desactivar', () => {
    const resumen = resumenDeEliminacion(campo, {
      total: 5,
      conValor: 1,
      sinValor: 4,
      porOpcion: {},
    })
    expect(resumen.bloquea).toBe(true)
    expect(resumen.avisos[0]).toContain('1 vehículo tiene un valor en «Kit»')
  })

  it('sin datos avisa que no se deshace', () => {
    const resumen = resumenDeEliminacion(campo, {
      total: 5,
      conValor: 0,
      sinValor: 5,
      porOpcion: {},
    })
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('no se puede deshacer')
  })
})
