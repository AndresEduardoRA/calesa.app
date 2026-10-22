import { describe, expect, it } from 'vitest'
import type { CampoDeLead } from './campo'
import { filtrosDescartados, textoDeFiltroDescartado } from './filtros-descartados'

function campo(clave: string, extra: Partial<CampoDeLead> = {}): CampoDeLead {
  return {
    id: `id-${clave}`,
    clave,
    etiqueta: clave.toUpperCase(),
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valorDefecto: null,
    grupo: null,
    orden: 0,
    esSistema: false,
    activo: true,
    actualizadoEn: '2026-10-14T00:00:00Z',
    enTabla: false,
    filtrable: true,
    soloCartera: false,
    privacidadPendiente: null,
    valorDefectoEmpresa: null,
    ...extra,
  }
}

const CAMPOS = [
  campo('ciudad'),
  campo('edad', { tipo: 'numero' }),
  campo('ci', { tipo: 'documento', soloCartera: true }),
  campo('notas', { filtrable: false }),
  campo('apagado', { activo: false }),
  campo('signo', {
    tipo: 'opcion',
    opciones: [
      { clave: 'aries', etiqueta: 'Aries' },
      { clave: 'leo', etiqueta: 'Leo' },
    ],
  }),
]

describe('filtrosDescartados', () => {
  it('dice cuáles de la URL ya no valen y por qué, una vez por campo', () => {
    const descartados = filtrosDescartados(CAMPOS, {
      'a.edad.min': '30', // vigente
      'a.apagado': 'x',
      'a.notas': 'y',
      'a.fantasma.min': '1',
      'a.fantasma.max': '5',
      tipo: 'cliente',
      'a.ciudad': '',
    })
    expect(descartados).toEqual([
      { clave: 'apagado', etiqueta: 'APAGADO', motivo: 'desactivado', parametros: ['a.apagado'] },
      { clave: 'notas', etiqueta: 'NOTAS', motivo: 'no_filtrable', parametros: ['a.notas'] },
      {
        clave: 'fantasma',
        etiqueta: null,
        motivo: 'inexistente',
        parametros: ['a.fantasma.min', 'a.fantasma.max'],
      },
    ])
  })

  it('sin nada descartado, vacío', () => {
    expect(filtrosDescartados(CAMPOS, { 'a.ciudad': 'cruz', q: 'ana' })).toEqual([])
  })

  it('cada motivo tiene su texto, con la etiqueta de la fila', () => {
    expect(
      textoDeFiltroDescartado({
        clave: 'x',
        etiqueta: 'Edad',
        motivo: 'desactivado',
        parametros: [],
      }),
    ).toBe('Se quitó el filtro «Edad»: ese campo está desactivado.')
    expect(
      textoDeFiltroDescartado({
        clave: 'x',
        etiqueta: 'Edad',
        motivo: 'no_filtrable',
        parametros: [],
      }),
    ).toBe('Se quitó el filtro «Edad»: ese campo ya no se puede filtrar.')
    expect(
      textoDeFiltroDescartado({
        clave: 'x',
        etiqueta: null,
        motivo: 'inexistente',
        parametros: [],
      }),
    ).toBe('Se quitó un filtro de un campo que ya no existe.')
  })
})

describe('un texto de un campo que no alcanza el mínimo (4.03, 5a-9)', () => {
  it('lo dice una vez por campo, con el mismo motivo para una vista vieja o una URL escrita a mano', () => {
    const descartados = filtrosDescartados(CAMPOS, {
      'a.ciudad': 'cr',
      'a.ci': '12',
      'a.edad.min': '5', // un número no tiene mínimo de letras
      'a.signo': 'x', // una opción tampoco: otra regla
    })
    const cortos = descartados.filter((d) => d.motivo === 'texto_corto')
    expect(cortos).toEqual([
      { clave: 'ciudad', etiqueta: 'CIUDAD', motivo: 'texto_corto', parametros: ['a.ciudad'] },
      { clave: 'ci', etiqueta: 'CI', motivo: 'texto_corto', parametros: ['a.ci'] },
    ])
    expect(descartados.some((d) => d.clave === 'edad')).toBe(false)
  })

  it('con 3 letras o más vale: no se dice nada', () => {
    expect(filtrosDescartados(CAMPOS, { 'a.ciudad': 'cru', 'a.ci': '123' })).toEqual([])
  })

  it('el texto nombra el campo y pide 3 letras', () => {
    expect(
      textoDeFiltroDescartado({
        clave: 'ciudad',
        etiqueta: 'CIUDAD',
        motivo: 'texto_corto',
        parametros: ['a.ciudad'],
      }),
    ).toBe('Se quitó el filtro «CIUDAD»: escribe al menos 3 letras.')
  })
})
