import { describe, expect, it } from 'vitest'
import type { CampoDeLead } from './campo'
import { REQUERIDOS_QUE_ALARGAN_EL_ALTA, resumenDeEliminacion, resumenDeImpacto } from './impacto'

const CAMPO: CampoDeLead = {
  id: '00000000-0000-0000-0000-000000000001',
  clave: 'signo',
  etiqueta: 'Signo',
  tipo: 'opcion',
  opciones: [
    { clave: 'aries', etiqueta: 'Aries' },
    { clave: 'leo', etiqueta: 'Leo' },
  ],
  requerido: false,
  valorDefecto: null,
  valorDefectoEmpresa: null,
  grupo: null,
  orden: 10,
  enTabla: false,
  filtrable: false,
  soloCartera: false,
  privacidadPendiente: null,
  esSistema: false,
  activo: true,
  actualizadoEn: '2026-10-14T20:00:00+00:00',
}
const IMPACTO = { total: 5, conValor: 3, sinValor: 2, porOpcion: { leo: 3 } }

describe('resumenDeImpacto', () => {
  it('lo del motor, dicho con «lead»', () => {
    const resumen = resumenDeImpacto(CAMPO, { tipo: 'numero' }, IMPACTO, 0)
    expect(resumen.bloquea).toBe(true)
    expect(resumen.avisos[0]).toContain('3 leads ya tienen un valor en «Signo»')
  })

  it('volver requerido cuenta cuántos quedan incompletos y cuánto pide el alta rápida', () => {
    const resumen = resumenDeImpacto(CAMPO, { requerido: true }, IMPACTO, 1)
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('2 leads no tienen este dato')
    expect(resumen.avisos[1]).toBe('El alta rápida pedirá 2 datos además del teléfono y el nombre.')
  })

  it('con el primero concuerda en singular', () => {
    const resumen = resumenDeImpacto(CAMPO, { requerido: true }, { ...IMPACTO, sinValor: 0 }, 0)
    expect(resumen.avisos).toEqual([
      'El alta rápida pedirá 1 dato además del teléfono y el nombre.',
    ])
  })

  it('desde el cuarto obligatorio avisa que la meta de 25 segundos cuesta', () => {
    const antes = resumenDeImpacto(
      CAMPO,
      { requerido: true },
      { ...IMPACTO, sinValor: 0 },
      REQUERIDOS_QUE_ALARGAN_EL_ALTA - 2,
    )
    expect(antes.avisos.join(' ')).not.toContain('25 segundos')
    const despues = resumenDeImpacto(
      CAMPO,
      { requerido: true },
      { ...IMPACTO, sinValor: 0 },
      REQUERIDOS_QUE_ALARGAN_EL_ALTA - 1,
    )
    expect(despues.avisos.join(' ')).toContain('25 segundos')
  })

  it('un campo que ya era requerido o está apagado no suma al alta rápida', () => {
    expect(
      resumenDeImpacto({ ...CAMPO, requerido: true }, { requerido: true }, IMPACTO, 1).avisos,
    ).toEqual([])
    expect(
      resumenDeImpacto(
        { ...CAMPO, activo: false },
        { requerido: true },
        { ...IMPACTO, sinValor: 0 },
        1,
      ).avisos,
    ).toEqual([])
  })

  it('sacar un campo de «solo la cartera» dice a cuántos leads se expone', () => {
    const privado = { ...CAMPO, soloCartera: true }
    const resumen = resumenDeImpacto(privado, { soloCartera: false }, IMPACTO, 0)
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('3 leads tienen un valor en «Signo»')
    expect(resumen.avisos[0]).toContain('empezará a recibirlo')
  })

  it('sacarlo sin datos o volverlo privado no avisa nada', () => {
    const privado = { ...CAMPO, soloCartera: true }
    expect(
      resumenDeImpacto(privado, { soloCartera: false }, { ...IMPACTO, conValor: 0 }, 0).avisos,
    ).toEqual([])
    expect(resumenDeImpacto(CAMPO, { soloCartera: true }, IMPACTO, 0).avisos).toEqual([])
  })
})

describe('resumenDeEliminacion', () => {
  it('con datos bloquea y manda a desactivar', () => {
    const resumen = resumenDeEliminacion(CAMPO, { ...IMPACTO, conValor: 1 })
    expect(resumen.bloquea).toBe(true)
    expect(resumen.avisos[0]).toContain('1 lead tiene un valor en «Signo»')
  })

  it('sin datos avisa que no se deshace', () => {
    const resumen = resumenDeEliminacion(CAMPO, { ...IMPACTO, conValor: 0 })
    expect(resumen.bloquea).toBe(false)
    expect(resumen.avisos[0]).toContain('Ningún lead usa «Signo»')
  })
})
