import { describe, expect, it } from 'vitest'
import {
  cambiosComoColumnas,
  cambiosRespectoDe,
  necesitaVistaPrevia,
  opcionesQuitadas,
} from './cambios-de-campo'
import { camposDesde, type CampoDeLayout } from './campo'

function layout(extra: Record<string, unknown>): CampoDeLayout[] {
  return camposDesde([
    {
      id: '00000000-0000-0000-0000-000000000001',
      origen_id: '00000000-0000-0000-0000-0000000000aa',
      clave: 'campo_1',
      etiqueta: 'Campo 1',
      tipo: 'texto',
      opciones: [],
      requerido: false,
      valor_defecto: null,
      grupo: 'Vehículo',
      orden: 10,
      en_tarjeta: false,
      filtrable: false,
      publico_web: false,
      clave_apibara: null,
      es_sistema: false,
      activo: true,
      actualizado_en: '2026-10-12T20:00:00+00:00',
      ...extra,
    },
  ])
}

describe('cambios', () => {
  const [campo] = layout({
    tipo: 'opcion',
    opciones: [
      { clave: 'a', etiqueta: 'A' },
      { clave: 'b', etiqueta: 'B' },
    ],
  })
  if (!campo) {
    throw new Error('sin campo')
  }
  const igual = {
    etiqueta: campo.etiqueta,
    tipo: campo.tipo,
    opciones: campo.opciones,
    requerido: campo.requerido,
    grupo: campo.grupo,
    enTarjeta: campo.enTarjeta,
    filtrable: campo.filtrable,
    publicoWeb: campo.publicoWeb,
    claveApibara: campo.claveApibara,
    activo: campo.activo,
    valorDefecto: campo.valorDefecto,
  }

  it('sin tocar nada no hay cambios', () => {
    expect(cambiosRespectoDe(campo, igual)).toEqual({})
  })

  it('sólo viaja lo que cambió', () => {
    expect(cambiosRespectoDe(campo, { ...igual, filtrable: true, grupo: null })).toEqual({
      filtrable: true,
      grupo: null,
    })
  })

  it('traduce a columnas y deja un nulo explícito', () => {
    expect(cambiosComoColumnas({ enTarjeta: true, grupo: null, publicoWeb: false })).toEqual({
      en_tarjeta: true,
      grupo: null,
      publico_web: false,
    })
  })

  it('sabe qué opciones se sacan', () => {
    expect(opcionesQuitadas(campo, { opciones: [{ clave: 'a', etiqueta: 'A' }] })).toEqual([
      { clave: 'b', etiqueta: 'B' },
    ])
    expect(opcionesQuitadas(campo, {})).toEqual([])
  })

  it('pide contar sólo cuando un cambio puede tocar datos', () => {
    expect(necesitaVistaPrevia(campo, { filtrable: true })).toBe(false)
    expect(necesitaVistaPrevia(campo, { activo: false })).toBe(false)
    expect(necesitaVistaPrevia(campo, { tipo: 'texto' })).toBe(true)
    expect(necesitaVistaPrevia(campo, { requerido: true })).toBe(true)
    expect(necesitaVistaPrevia(campo, { opciones: [{ clave: 'a', etiqueta: 'A' }] })).toBe(true)
    expect(
      necesitaVistaPrevia(campo, {
        opciones: [
          { clave: 'a', etiqueta: 'A' },
          { clave: 'b', etiqueta: 'Be' },
        ],
      }),
    ).toBe(false)
  })

  it('el valor por defecto viaja cuando cambia, también para vaciarlo', () => {
    expect(cambiosRespectoDe(campo, { ...igual, valorDefecto: 'a' })).toEqual({ valorDefecto: 'a' })
    const conDefecto = { ...campo, valorDefecto: ['a'] }
    expect(cambiosRespectoDe(conDefecto, { ...igual, valorDefecto: ['a'] })).toEqual({})
    expect(cambiosRespectoDe(conDefecto, { ...igual, valorDefecto: null })).toEqual({
      valorDefecto: null,
    })
    expect(cambiosComoColumnas({ valorDefecto: null })).toEqual({ valor_defecto: null })
  })
})
