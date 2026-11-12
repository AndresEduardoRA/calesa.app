import { describe, expect, it } from 'vitest'
import {
  esquemaDelCuerpoDeLaNota,
  notasDesde,
  quePuedeHacerConLaNota,
  restantesDeLaNota,
  textoDelOrigenDeLaNota,
} from './notas'

describe('quePuedeHacerConLaNota', () => {
  it('sólo la propia y que no sea de un cambio de fase', () => {
    expect(quePuedeHacerConLaNota({ mia: true, deCambioDeFase: null })).toEqual({
      editar: true,
      borrar: true,
    })
    expect(quePuedeHacerConLaNota({ mia: false, deCambioDeFase: null })).toEqual({
      editar: false,
      borrar: false,
    })
    expect(quePuedeHacerConLaNota({ mia: true, deCambioDeFase: { haciaFase: 'B' } })).toEqual({
      editar: false,
      borrar: false,
    })
  })
})

describe('textoDelOrigenDeLaNota', () => {
  it('nombra la fase a la que se pasó, o lo dice sin nombre', () => {
    expect(textoDelOrigenDeLaNota({ deCambioDeFase: { haciaFase: 'B' } })).toBe('al pasar a «B»')
    expect(textoDelOrigenDeLaNota({ deCambioDeFase: { haciaFase: null } })).toBe('al pasar de fase')
    expect(textoDelOrigenDeLaNota({ deCambioDeFase: null })).toBeNull()
  })
})

describe('esquemaDelCuerpoDeLaNota', () => {
  it('recorta y pide de 1 a 2000 caracteres', () => {
    expect(esquemaDelCuerpoDeLaNota.parse('  Hola  ')).toBe('Hola')
    expect(esquemaDelCuerpoDeLaNota.safeParse('   ').success).toBe(false)
    expect(esquemaDelCuerpoDeLaNota.safeParse('a'.repeat(2000)).success).toBe(true)
    expect(esquemaDelCuerpoDeLaNota.safeParse('a'.repeat(2001)).success).toBe(false)
    expect(restantesDeLaNota('abc')).toBe(1997)
  })
})

describe('notasDesde', () => {
  const fila = {
    id: '11111111-1111-4111-8111-111111111111',
    cuerpo: 'Hola',
    autor_id: '22222222-2222-4222-8222-222222222222',
    historial_fase_id: null,
    creado_en: '2026-11-12T10:00:00+00:00',
    actualizado_en: '2026-11-12T10:00:00+00:00',
    autor: { nombre: 'Ana' },
    historial: null,
  }
  it('marca la propia por el id de quien mira y la de cambio por su fase', () => {
    const [nota] = notasDesde([fila], '22222222-2222-4222-8222-222222222222') ?? []
    expect(nota?.mia).toBe(true)
    expect(nota?.autor).toBe('Ana')
    const [cambio] =
      notasDesde(
        [{ ...fila, historial_fase_id: fila.id, historial: { a: { nombre: 'B' } } }],
        null,
      ) ?? []
    expect(cambio?.mia).toBe(false)
    expect(cambio?.deCambioDeFase).toEqual({ haciaFase: 'B' })
  })
  it('una forma mala es nulo', () => {
    expect(notasDesde([{ id: 1 }], null)).toBeNull()
  })
})
