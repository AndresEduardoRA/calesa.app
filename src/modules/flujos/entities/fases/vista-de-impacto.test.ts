import { describe, expect, it } from 'vitest'
import {
  AVISO_DE_UNICA_INICIAL,
  MOTIVO_DE_BLOQUEO,
  avisoDeLoHecho,
  impactoDeFaseDesde,
  vistaDelImpacto,
  type AccionDeImpacto,
  type MotivoDeImpacto,
} from './vista-de-impacto'

function impacto(
  accion: AccionDeImpacto,
  motivo: MotivoDeImpacto | null,
  resto: Partial<{
    paradas: number
    hayHistorial: boolean
    esperas: number
    unicaInicial: boolean
  }> = {},
) {
  return impactoDeFaseDesde({
    accion,
    motivo,
    paradas: 0,
    hayHistorial: false,
    esperas: 0,
    unicaInicial: false,
    ...resto,
  })
}

describe('impactoDeFaseDesde', () => {
  it('acota los conteos al tope de 50: 51 es «más de 50»', () => {
    const i = impacto('jubilar', 'paradas', { paradas: 51, esperas: 3 })
    expect(i.paradas).toEqual({ n: 50, hayMas: true })
    expect(i.esperas).toEqual({ n: 3, hayMas: false })
  })
})

describe('vistaDelImpacto', () => {
  it('eliminar: dice que no se puede deshacer', () => {
    const v = vistaDelImpacto('En puerto', impacto('eliminar', null))
    expect(v).toMatchObject({ etiqueta: 'Eliminar fase', puedeConfirmar: true, avisos: [] })
    expect(v.texto).toBe(
      'Se elimina «En puerto». No tiene unidades ni historial y no se puede deshacer.',
    )
  })

  it('jubilar con unidades: cuántas siguen en ella', () => {
    expect(vistaDelImpacto('X', impacto('jubilar', 'paradas', { paradas: 1 })).texto).toBe(
      'Se jubila «X»: 1 unidad sigue en ella y deja de ser destino. Podrás reactivarla.',
    )
    expect(vistaDelImpacto('X', impacto('jubilar', 'paradas', { paradas: 7 })).texto).toContain(
      '7 unidades siguen en ella',
    )
    expect(vistaDelImpacto('X', impacto('jubilar', 'paradas', { paradas: 51 })).texto).toContain(
      'más de 50 unidades siguen en ella',
    )
  })

  it('jubilar con sólo historial: lo dice', () => {
    const v = vistaDelImpacto('X', impacto('jubilar', 'historial', { hayHistorial: true }))
    expect(v).toMatchObject({ etiqueta: 'Jubilar fase', puedeConfirmar: true })
    expect(v.texto).toBe(
      'Se jubila «X»: Tiene historial de movimientos y deja de ser destino. Podrás reactivarla.',
    )
  })

  it('la única inicial que se jubila lleva su aviso, sin impedirlo', () => {
    const v = vistaDelImpacto(
      'X',
      impacto('jubilar', 'paradas', { paradas: 2, unicaInicial: true }),
    )
    expect(v.avisos).toEqual([AVISO_DE_UNICA_INICIAL])
    expect(v.puedeConfirmar).toBe(true)
  })

  it('bloqueada: el motivo y confirmar apagado', () => {
    for (const motivo of ['esperas', 'unica_inicial', 'ya_jubilada'] as const) {
      const v = vistaDelImpacto('X', impacto('bloqueada', motivo, { unicaInicial: true }))
      expect(v).toMatchObject({
        texto: MOTIVO_DE_BLOQUEO[motivo],
        puedeConfirmar: false,
        avisos: [],
      })
    }
  })

  it('bloqueada con un motivo que no se conoce, no se puede confirmar y lo dice', () => {
    const v = vistaDelImpacto('X', impacto('bloqueada', null))
    expect(v.puedeConfirmar).toBe(false)
    expect(v.texto).toContain('No se puede')
  })
})

describe('avisoDeLoHecho', () => {
  it('dice lo que la base hizo', () => {
    expect(avisoDeLoHecho('eliminada', 'X')).toBe('Fase «X» eliminada.')
    expect(avisoDeLoHecho('jubilada', 'X')).toBe('Fase «X» jubilada.')
  })
})
