import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DE_MAXIMO_INVALIDO,
  ajustesDeLeadsDesde,
  choquesDesde,
  validarMaximoDeExtras,
} from './ajustes-de-leads'

const VERSION = '2026-11-12T12:00:00.123456+00:00'
const TELEFONOS = { maximo: 6, como_principal: false, actualizado_en: VERSION }

describe('ajustesDeLeadsDesde, el contrato de ajustes_leads_leer()', () => {
  it('las de fábrica llegan sin marcas: valen false, sin id', () => {
    const leidos = ajustesDeLeadsDesde({
      embudo: {
        etapas: [
          { nombre: 'Nuevo', color: 'gris', es_inicial: true },
          { nombre: 'Contactado', color: 'azul' },
          { nombre: 'Ganado', color: 'verde', es_ganada: true },
        ],
        de_fabrica: true,
        actualizado_en: VERSION,
      },
      portal: { mensaje: null, actualizado_en: VERSION },
      telefonos: TELEFONOS,
    })
    expect(leidos?.embudo.deFabrica).toBe(true)
    expect(leidos?.embudo.etapas[1]).toEqual({
      id: null,
      nombre: 'Contactado',
      color: 'azul',
      esInicial: false,
      esGanada: false,
      esPerdida: false,
    })
    expect(leidos?.portal).toEqual({ mensaje: null, actualizadoEn: VERSION })
    expect(leidos?.telefonos).toEqual({ maximo: 6, comoPrincipal: false, actualizadoEn: VERSION })
  })

  it('una plantilla completa sale igual, y el mensaje propio también', () => {
    const leidos = ajustesDeLeadsDesde({
      embudo: {
        etapas: [
          {
            nombre: 'Llamado',
            color: 'rojo',
            es_inicial: false,
            es_ganada: false,
            es_perdida: true,
          },
        ],
        de_fabrica: false,
        actualizado_en: VERSION,
      },
      portal: { mensaje: 'Entra con {codigo} y {clave}.', actualizado_en: VERSION },
      telefonos: { ...TELEFONOS, maximo: 20, como_principal: true },
    })
    expect(leidos?.embudo.etapas[0]?.esPerdida).toBe(true)
    expect(leidos?.embudo.deFabrica).toBe(false)
    expect(leidos?.portal.mensaje).toBe('Entra con {codigo} y {clave}.')
    expect(leidos?.telefonos).toMatchObject({ maximo: 20, comoPrincipal: true })
  })

  it('sin la forma, null', () => {
    expect(ajustesDeLeadsDesde(null)).toBeNull()
    expect(ajustesDeLeadsDesde({ portal: { mensaje: null, actualizado_en: VERSION } })).toBeNull()
  })

  it('un máximo fuera de 0 a 20 no es de la base: null', () => {
    const embudo = { etapas: [], de_fabrica: true, actualizado_en: VERSION }
    const portal = { mensaje: null, actualizado_en: VERSION }
    expect(
      ajustesDeLeadsDesde({ embudo, portal, telefonos: { ...TELEFONOS, maximo: 21 } }),
    ).toBeNull()
    expect(
      ajustesDeLeadsDesde({ embudo, portal, telefonos: { ...TELEFONOS, maximo: -1 } }),
    ).toBeNull()
  })
})

describe('validarMaximoDeExtras', () => {
  it('acepta de 0 a 20 y dice el mismo motivo que la base si no', () => {
    expect(validarMaximoDeExtras('0')).toEqual({ ok: true, maximo: 0 })
    expect(validarMaximoDeExtras(' 6 ')).toEqual({ ok: true, maximo: 6 })
    expect(validarMaximoDeExtras('20')).toEqual({ ok: true, maximo: 20 })
    for (const texto of ['21', '-1', '', 'a', '2,5', '1e1', '99']) {
      expect(validarMaximoDeExtras(texto)).toEqual({ ok: false, motivo: MOTIVO_DE_MAXIMO_INVALIDO })
    }
    expect(MOTIVO_DE_MAXIMO_INVALIDO).toBe('El máximo va de 0 a 20.')
  })
})

describe('choquesDesde', () => {
  const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
  const OTRO = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'

  it('lee una página con lo que quien mira no ve como nulo', () => {
    const pagina = choquesDesde({
      filas: [
        {
          id: ID,
          telefono: '591••••••02',
          lead: { id: null, nombre: null },
          otro: { id: OTRO, nombre: 'Ana', como: 'principal' },
        },
      ],
      siguiente: ID,
      hay_mas: true,
      recorrido_cortado: false,
    })
    expect(pagina).toEqual({
      filas: [
        {
          id: ID,
          telefono: '591••••••02',
          lead: { id: null, nombre: null },
          otro: { id: OTRO, nombre: 'Ana', como: 'principal' },
        },
      ],
      siguiente: ID,
      hayMas: true,
      recorridoCortado: false,
    })
  })

  it('una forma que no calza es nula', () => {
    expect(choquesDesde(null)).toBeNull()
    expect(choquesDesde({ filas: [], siguiente: null, hay_mas: false })).toBeNull()
  })
})
