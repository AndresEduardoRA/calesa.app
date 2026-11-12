import { describe, expect, it } from 'vitest'
import { rechazoDeTestimonio, TESTIMONIO_QUE_YA_NO_EXISTE } from './errores'
import {
  estadoDeConsentimiento,
  motivoSinPublicar,
  puedePublicar,
  resumenDeConsentimiento,
  testimoniosDesde,
  type Testimonio,
} from './testimonios'
import {
  AVISO_QUE_ANULA,
  avisosDeCambio,
  cambiosDeTestimonio,
  validarConsentimiento,
  valoresDeConsentimiento,
  valoresDeTestimonio,
  validarTestimonio,
} from './testimonios-formulario'

const ID = '0f4c6f0e-6a3a-4d3a-9d0a-1f6f0e6a3a4d'
const SIN: Testimonio = {
  id: ID,
  cliente: 'Ana Pérez',
  ciudad: 'Cochabamba',
  texto: 'Todo salió bien.',
  vehiculo: 'Toyota Hilux',
  fotoRuta: 'testimonios/abc.webp',
  publicado: false,
  orden: 0,
  consentPor: null,
  consentEn: null,
  consentCanal: null,
  consentCiudad: false,
  consentVehiculo: false,
  consentFoto: false,
  consentRetiradoEn: null,
  actualizadoEn: '2026-11-12T10:00:00.000Z',
}
const VIGENTE: Testimonio = {
  ...SIN,
  consentPor: '11111111-1111-4111-8111-111111111111',
  consentEn: '2026-11-12T11:00:00.000Z',
  consentCanal: 'WhatsApp',
  consentCiudad: true,
}
const RETIRADO: Testimonio = { ...VIGENTE, consentRetiradoEn: '2026-11-12T12:00:00.000Z' }

describe('el consentimiento de un testimonio', () => {
  it('es sin, vigente o retirado, y sólo vigente deja publicar', () => {
    expect(estadoDeConsentimiento(SIN)).toBe('sin')
    expect(estadoDeConsentimiento(VIGENTE)).toBe('vigente')
    expect(estadoDeConsentimiento(RETIRADO)).toBe('retirado')
    expect(puedePublicar(SIN)).toBe(false)
    expect(puedePublicar(VIGENTE)).toBe(true)
    expect(puedePublicar(RETIRADO)).toBe(false)
  })

  it('un trío incompleto no es consentimiento', () => {
    expect(estadoDeConsentimiento({ ...VIGENTE, consentCanal: null })).toBe('sin')
    expect(estadoDeConsentimiento({ ...VIGENTE, consentEn: null })).toBe('sin')
  })

  it('el motivo de no publicar es el mismo sin consentimiento y tras retirarlo', () => {
    expect(motivoSinPublicar(SIN)).toBe('Falta registrar el consentimiento.')
    expect(motivoSinPublicar(RETIRADO)).toBe('Falta registrar el consentimiento.')
    expect(motivoSinPublicar(VIGENTE)).toBeNull()
  })

  it('la lista lo dice sin el nombre de quien lo registró', () => {
    expect(resumenDeConsentimiento(SIN)).toBe('Sin consentimiento')
    expect(resumenDeConsentimiento(VIGENTE)).toMatch(/^Consentimiento registrado el /)
    expect(resumenDeConsentimiento(RETIRADO)).toMatch(/^Consentimiento retirado el /)
  })
})

describe('avisar antes de guardar', () => {
  const valores = valoresDeTestimonio(VIGENTE)
  it('cambiar el cliente, el texto o la foto de uno vigente anula el consentimiento', () => {
    expect(avisosDeCambio(VIGENTE, { ...valores, cliente: 'Otra' }, false)).toContain(
      AVISO_QUE_ANULA,
    )
    expect(avisosDeCambio(VIGENTE, { ...valores, texto: 'Otro texto' }, false)).toContain(
      AVISO_QUE_ANULA,
    )
    expect(avisosDeCambio(VIGENTE, valores, true)).toContain(AVISO_QUE_ANULA)
  })
  it('cambiar la ciudad o el vehículo avisa sólo si estaban consentidos', () => {
    expect(avisosDeCambio(VIGENTE, { ...valores, ciudad: 'La Paz' }, false)).toEqual([
      'Cambiar la ciudad apaga el permiso para mostrarla.',
    ])
    expect(avisosDeCambio(VIGENTE, { ...valores, vehiculo: 'Otro' }, false)).toEqual([])
  })
  it('uno sin consentimiento o retirado no avisa nada', () => {
    expect(avisosDeCambio(SIN, { ...valoresDeTestimonio(SIN), texto: 'x' }, true)).toEqual([])
    expect(avisosDeCambio(RETIRADO, { ...valores, texto: 'x' }, true)).toEqual([])
  })
})

describe('guardar sólo lo que cambió', () => {
  const datos = (t: Testimonio) => {
    const v = validarTestimonio(valoresDeTestimonio(t))
    if (!v.ok) throw new Error('inválido')
    return { ...v.datos, fotoRuta: t.fotoRuta }
  }
  it('sin cambios no hay nada que guardar', () => {
    expect(cambiosDeTestimonio(SIN, datos(SIN))).toBeNull()
  })
  it('manda lo que cambió', () => {
    expect(cambiosDeTestimonio(SIN, { ...datos(SIN), ciudad: 'La Paz', publicado: true })).toEqual({
      ciudad: 'La Paz',
      publicado: true,
    })
  })
  it('si anula el consentimiento no manda `publicado`', () => {
    expect(
      cambiosDeTestimonio(VIGENTE, { ...datos(VIGENTE), texto: 'Nuevo', publicado: true }),
    ).toEqual({ texto: 'Nuevo' })
  })
})

describe('validar', () => {
  it('pide cliente y texto, y recorta', () => {
    const malo = validarTestimonio({ ...valoresDeTestimonio(SIN), cliente: ' ', texto: '' })
    expect(malo.ok).toBe(false)
    const bueno = validarTestimonio({ ...valoresDeTestimonio(SIN), ciudad: '  ' })
    expect(bueno.ok && bueno.datos.ciudad).toBeNull()
  })
  it('el canal del consentimiento es obligatorio, de hasta 80 letras', () => {
    expect(validarConsentimiento({ ...valoresDeConsentimiento(SIN), canal: ' ' }, SIN).ok).toBe(
      false,
    )
    expect(
      validarConsentimiento({ ...valoresDeConsentimiento(SIN), canal: 'x'.repeat(81) }, SIN).ok,
    ).toBe(false)
  })
  it('apaga la casilla de un dato que el testimonio no tiene', () => {
    const sinCiudad = { ...SIN, ciudad: null }
    const v = validarConsentimiento(
      { canal: ' WhatsApp ', ciudad: true, vehiculo: true, foto: true },
      sinCiudad,
    )
    expect(v).toEqual({
      ok: true,
      datos: { canal: 'WhatsApp', ciudad: false, vehiculo: true, foto: true },
    })
  })
})

describe('leer filas', () => {
  it('rechaza una fila que no tiene la forma', () => {
    expect(testimoniosDesde([{ id: 'no-es-guid' }])).toBeNull()
    expect(testimoniosDesde([])).toEqual([])
  })
})

describe('el error de la base', () => {
  it('retirar sin consentimiento dice el mensaje de la base', () => {
    const r = rechazoDeTestimonio({
      code: '22022',
      message: 'Este testimonio no tiene un consentimiento registrado.',
      hint: 'consentimiento',
    })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error.mensaje).toBe('Este testimonio no tiene un consentimiento registrado.')
  })
  it('un canal inválido va junto a su campo', () => {
    const r = rechazoDeTestimonio({ code: '22023', message: 'Escribe el canal.', hint: 'canal' })
    expect('porCampo' in r && r.porCampo).toEqual({ canal: 'Escribe el canal.' })
  })
  it('un testimonio que ya no existe es un conflicto', () => {
    const r = rechazoDeTestimonio({ code: 'P0002', message: 'No encontramos este testimonio.' })
    expect(!r.ok && r.error).toEqual({ codigo: 'conflicto', mensaje: TESTIMONIO_QUE_YA_NO_EXISTE })
  })
})
