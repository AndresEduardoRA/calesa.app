import { describe, expect, it } from 'vitest'
import {
  MENSAJE_SIN_RED_AL_DESCARTAR,
  PANEL_DESCARTAR_BORRADOR,
  descripcionDelDescarte,
  motivoParaNoAbrirDescartar,
  tituloDelDescarte,
} from './descarte'
import type { BorradorDelOrigen, EstadoDeLaFormula, PublicadaDelOrigen } from './versiones'

const V1 = '00000000-0000-4000-8000-000000000001'
const V2 = '00000000-0000-4000-8000-000000000002'

const publicada: PublicadaDelOrigen = {
  id: V2,
  version: 2,
  nota: null,
  publicadoPor: null,
  publicadoEn: null,
}
const borrador = (versionOrigenId: string | null): BorradorDelOrigen => ({
  id: '00000000-0000-4000-8000-000000000050',
  nota: null,
  creadoPor: null,
  actualizadoEn: '2026-11-06T10:00:00+00:00',
  versionOrigenId,
  versionDeOrigen: null,
})
const estado = (b: BorradorDelOrigen | null): EstadoDeLaFormula => ({ publicada, borrador: b })

describe('motivoParaNoAbrirDescartar (al llegar por la URL)', () => {
  it('sin borrador no abre', () => {
    expect(motivoParaNoAbrirDescartar(estado(null))).toBe('No hay borrador para descartar.')
  })

  it('abre con el borrador al día y también atrasado (ya no se publica, pero se descarta)', () => {
    expect(motivoParaNoAbrirDescartar(estado(borrador(V2)))).toBeNull()
    expect(motivoParaNoAbrirDescartar(estado(borrador(V1)))).toBeNull()
    expect(motivoParaNoAbrirDescartar({ publicada: null, borrador: borrador(null) })).toBeNull()
  })
})

describe('los textos del diálogo', () => {
  it('el título nombra de quién es el borrador', () => {
    expect(tituloDelDescarte('Ana Pérez')).toBe('Descartar el borrador de Ana Pérez')
  })

  it('la descripción dice cuándo se guardó, que no se deshace y que la publicada no cambia', () => {
    expect(descripcionDelDescarte('hace 2 minutos')).toBe(
      'Guardado hace 2 minutos. Se borra y no se puede deshacer; la versión publicada no cambia.',
    )
  })

  it('sin respuesta no se sabe si se descartó', () => {
    expect(MENSAJE_SIN_RED_AL_DESCARTAR).toBe('No sabemos si se descartó: recarga para verlo.')
  })

  it('el panel de la URL', () => {
    expect(PANEL_DESCARTAR_BORRADOR).toBe('descartar-borrador')
  })
})
