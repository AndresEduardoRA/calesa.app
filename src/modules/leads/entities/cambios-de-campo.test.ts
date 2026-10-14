import { describe, expect, it } from 'vitest'
import { cambiosComoColumnas, cambiosRespectoDe, necesitaVistaPrevia } from './cambios-de-campo'
import type { CampoDeLead } from './campo'

const CAMPO: CampoDeLead = {
  id: '00000000-0000-0000-0000-000000000001',
  clave: 'signo',
  etiqueta: 'Signo zodiacal',
  tipo: 'opcion',
  opciones: [
    { clave: 'aries', etiqueta: 'Aries' },
    { clave: 'leo', etiqueta: 'Leo' },
  ],
  requerido: false,
  valorDefecto: null,
  valorDefectoEmpresa: null,
  grupo: 'Datos personales',
  orden: 10,
  enTabla: false,
  filtrable: true,
  soloCartera: false,
  esSistema: false,
  activo: true,
  actualizadoEn: '2026-10-14T20:00:00+00:00',
}

const IGUAL = {
  etiqueta: CAMPO.etiqueta,
  tipo: CAMPO.tipo,
  opciones: CAMPO.opciones,
  requerido: CAMPO.requerido,
  grupo: CAMPO.grupo,
  enTabla: CAMPO.enTabla,
  filtrable: CAMPO.filtrable,
  soloCartera: CAMPO.soloCartera,
  activo: CAMPO.activo,
  valorDefecto: CAMPO.valorDefecto,
  valorDefectoEmpresa: CAMPO.valorDefectoEmpresa,
}

describe('cambiosRespectoDe', () => {
  it('sin tocar nada no viaja nada', () => {
    expect(cambiosRespectoDe(CAMPO, IGUAL)).toEqual({})
  })

  it('sólo viaja lo que cambió', () => {
    expect(cambiosRespectoDe(CAMPO, { ...IGUAL, soloCartera: true, enTabla: true })).toEqual({
      soloCartera: true,
      enTabla: true,
    })
  })

  it('el valor por defecto y el de la empresa son cambios aparte', () => {
    expect(cambiosRespectoDe(CAMPO, { ...IGUAL, valorDefectoEmpresa: 'ciudad' })).toEqual({
      valorDefectoEmpresa: 'ciudad',
    })
  })
})

describe('cambiosComoColumnas', () => {
  it('traduce a las columnas de la base y no manda lo que no cambió', () => {
    expect(
      cambiosComoColumnas({ soloCartera: true, enTabla: false, valorDefectoEmpresa: null }),
    ).toEqual({ solo_cartera: true, en_tabla: false, valor_defecto_empresa: null })
  })

  it('las opciones viajan sólo con clave y etiqueta', () => {
    expect(cambiosComoColumnas({ opciones: [{ clave: 'a', etiqueta: 'A' }] })).toEqual({
      opciones: [{ clave: 'a', etiqueta: 'A' }],
    })
  })
})

describe('necesitaVistaPrevia', () => {
  it('cambiar el tipo, volver requerido o sacar una opción piden contar', () => {
    expect(necesitaVistaPrevia(CAMPO, { tipo: 'texto' })).toBe(true)
    expect(necesitaVistaPrevia(CAMPO, { requerido: true })).toBe(true)
    expect(necesitaVistaPrevia(CAMPO, { opciones: [{ clave: 'aries', etiqueta: 'Aries' }] })).toBe(
      true,
    )
  })

  it('sacar un campo de «solo la cartera» pide contar a quién se expone', () => {
    const privado = { ...CAMPO, soloCartera: true }
    expect(necesitaVistaPrevia(privado, { soloCartera: false })).toBe(true)
  })

  it('volverlo privado, renombrar o filtrar no piden nada', () => {
    expect(necesitaVistaPrevia(CAMPO, { soloCartera: true })).toBe(false)
    expect(necesitaVistaPrevia(CAMPO, { etiqueta: 'Signo' })).toBe(false)
    expect(necesitaVistaPrevia(CAMPO, { filtrable: false })).toBe(false)
  })
})
