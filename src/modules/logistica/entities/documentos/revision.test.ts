import { describe, expect, it } from 'vitest'
import {
  cambiosDeLaEdicion,
  FALTA_EL_MOTIVO,
  motivoDeRechazoValido,
  quePuedeHacer,
  SIN_PERMISO_PARA_APROBAR,
  TIPO_SIN_PORTAL,
  yaNoSeVeEnElPortal,
} from './revision'

const conPortal = { visiblePortalPermitido: true }
const sinPortal = { visiblePortalPermitido: false }
const subido = { estado: 'subido', visiblePortal: false } as const
const aprueba = { aprobar: true, subir: false }
const soloSube = { aprobar: false, subir: true }
const nada = { aprobar: false, subir: false }

describe('quePuedeHacer: permisos', () => {
  it('sin aprobar no hay aprobar, rechazar ni portal, y cada uno dice por qué', () => {
    const r = quePuedeHacer(subido, conPortal, soloSube)
    expect(r.aprobar).toEqual({ tipo: 'apagada', motivo: SIN_PERMISO_PARA_APROBAR })
    expect(r.rechazar).toEqual({ tipo: 'apagada', motivo: SIN_PERMISO_PARA_APROBAR })
    expect(r.portal).toEqual({ tipo: 'apagada', motivo: SIN_PERMISO_PARA_APROBAR })
  })

  it('con aprobar, aprobar sale en subido y en rechazado, nunca en aprobado', () => {
    expect(quePuedeHacer(subido, conPortal, aprueba).aprobar.tipo).toBe('habilitada')
    expect(
      quePuedeHacer({ estado: 'rechazado', visiblePortal: false }, conPortal, aprueba).aprobar.tipo,
    ).toBe('habilitada')
    expect(
      quePuedeHacer({ estado: 'aprobado', visiblePortal: false }, conPortal, aprueba).aprobar.tipo,
    ).toBe('oculta')
  })

  it('rechazar sólo sale en un documento subido', () => {
    expect(quePuedeHacer(subido, conPortal, aprueba).rechazar.tipo).toBe('habilitada')
    for (const estado of ['rechazado', 'aprobado', 'pendiente'] as const) {
      expect(
        quePuedeHacer({ estado, visiblePortal: false }, conPortal, aprueba).rechazar.tipo,
      ).toBe('oculta')
    }
  })

  it('con sólo subir salen editar y eliminar, y el portal no', () => {
    const r = quePuedeHacer(subido, conPortal, soloSube)
    expect(r.editar.tipo).toBe('habilitada')
    expect(r.eliminar.tipo).toBe('habilitada')
    expect(r.portal.tipo).toBe('apagada')
  })

  it('sin aprobar ni subir, editar y eliminar quedan apagados con su motivo', () => {
    const r = quePuedeHacer(subido, conPortal, nada)
    expect(r.editar).toMatchObject({ tipo: 'apagada', motivo: expect.any(String) })
    expect(r.eliminar).toMatchObject({ tipo: 'apagada', motivo: expect.any(String) })
  })

  it('con los permisos sin leer nada se puede y no hay motivo que decir', () => {
    const r = quePuedeHacer(subido, conPortal, { aprobar: null, subir: null })
    for (const accion of [r.aprobar, r.rechazar, r.editar, r.eliminar, r.portal]) {
      expect(accion).toEqual({ tipo: 'apagada', motivo: null })
    }
  })

  it('un tipo sin portal apaga el interruptor, salvo que el documento ya sea visible', () => {
    expect(quePuedeHacer(subido, sinPortal, aprueba).portal).toEqual({
      tipo: 'apagada',
      motivo: TIPO_SIN_PORTAL,
    })
    expect(quePuedeHacer(subido, null, aprueba).portal.tipo).toBe('apagada')
    const visible = { estado: 'aprobado', visiblePortal: true } as const
    expect(quePuedeHacer(visible, sinPortal, aprueba).portal.tipo).toBe('habilitada')
    expect(yaNoSeVeEnElPortal(visible, sinPortal)).toBe(true)
    expect(yaNoSeVeEnElPortal(visible, conPortal)).toBe(false)
    expect(quePuedeHacer(subido, conPortal, aprueba).portal.tipo).toBe('habilitada')
  })
})

describe('motivoDeRechazoValido', () => {
  it('recorta y acepta de 1 a 500 caracteres', () => {
    expect(motivoDeRechazoValido('  Borroso  ')).toBe('Borroso')
    expect(motivoDeRechazoValido('a'.repeat(500))).toHaveLength(500)
  })

  it('no vale vacío, de espacios ni de 501', () => {
    expect(motivoDeRechazoValido('')).toBeNull()
    expect(motivoDeRechazoValido('   ')).toBeNull()
    expect(motivoDeRechazoValido('a'.repeat(501))).toBeNull()
    expect(FALTA_EL_MOTIVO).toBe('Escribe el motivo del rechazo.')
  })
})

describe('cambiosDeLaEdicion', () => {
  const original = { emitidoEl: '2027-01-02', venceEl: null, nota: 'Original' }

  it('manda sólo lo que cambió, con la clave de la base', () => {
    expect(cambiosDeLaEdicion(original, { ...original, venceEl: '2028-01-02' })).toEqual({
      vence_el: '2028-01-02',
    })
    expect(
      cambiosDeLaEdicion(original, { ...original, nota: 'Otra', emitidoEl: '2027-02-02' }),
    ).toEqual({
      nota: 'Otra',
      emitido_el: '2027-02-02',
    })
  })

  it('vacío es nulo y nada cambiado es nulo', () => {
    expect(cambiosDeLaEdicion(original, { ...original, nota: '   ' })).toEqual({ nota: null })
    expect(cambiosDeLaEdicion(original, { ...original, emitidoEl: '' })).toEqual({
      emitido_el: null,
    })
    expect(cambiosDeLaEdicion(original, { ...original })).toBeNull()
    expect(cambiosDeLaEdicion({ ...original, nota: null }, { ...original, nota: '' })).toBeNull()
  })
})
