import { describe, expect, it } from 'vitest'
import { ajustesDeLeadsDesde } from './ajustes-de-leads'

const VERSION = '2026-11-12T12:00:00.123456+00:00'

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
    })
    expect(leidos?.embudo.etapas[0]?.esPerdida).toBe(true)
    expect(leidos?.embudo.deFabrica).toBe(false)
    expect(leidos?.portal.mensaje).toBe('Entra con {codigo} y {clave}.')
  })

  it('sin la forma, null', () => {
    expect(ajustesDeLeadsDesde(null)).toBeNull()
    expect(ajustesDeLeadsDesde({ portal: { mensaje: null, actualizado_en: VERSION } })).toBeNull()
  })
})
