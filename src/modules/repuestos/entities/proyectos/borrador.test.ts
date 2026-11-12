import { describe, expect, it } from 'vitest'
import { BORRADOR_NUEVO_DE_PROYECTO, validarProyecto } from './borrador'

const VEHICULO = '00000000-0000-4000-8000-000000000001'

describe('validarProyecto', () => {
  it('un proyecto de un vehículo sólo manda el id y las notas, no la etiqueta ni el cliente', () => {
    const r = validarProyecto({
      ...BORRADOR_NUEVO_DE_PROYECTO,
      origen: 'vehiculo',
      vehiculoId: VEHICULO,
      vehiculoEtiqueta: 'sobra',
      vin: 'sobra',
      clienteNombre: 'sobra',
    })
    expect(r).toEqual({ ok: true, datos: { vehiculoId: VEHICULO, notas: undefined } })
  })

  it('de un vehículo sin elegir pide el vehículo', () => {
    const r = validarProyecto({ ...BORRADOR_NUEVO_DE_PROYECTO, origen: 'vehiculo' })
    expect(r).toMatchObject({ ok: false, errores: { vehiculoId: 'Elige el vehículo.' } })
  })

  it('externo sin etiqueta pide qué vehículo es', () => {
    const r = validarProyecto({ ...BORRADOR_NUEVO_DE_PROYECTO, vehiculoEtiqueta: '   ' })
    expect(r).toMatchObject({
      ok: false,
      errores: { vehiculoEtiqueta: 'Escribe qué vehículo es.' },
    })
  })

  it('externo recorta los textos y no manda lo vacío', () => {
    const r = validarProyecto({
      ...BORRADOR_NUEVO_DE_PROYECTO,
      vehiculoEtiqueta: '  Camión  ',
      clienteNombre: ' Ana ',
    })
    expect(r).toEqual({
      ok: true,
      datos: {
        vehiculoEtiqueta: 'Camión',
        vin: undefined,
        leadId: undefined,
        clienteNombre: 'Ana',
        clienteTelefono: undefined,
        notas: undefined,
      },
    })
  })

  it('un lead que no es un id no pasa; uno válido sí', () => {
    const base = { ...BORRADOR_NUEVO_DE_PROYECTO, vehiculoEtiqueta: 'Camión' }
    expect(validarProyecto({ ...base, leadId: 'x' })).toMatchObject({
      ok: false,
      errores: { leadId: expect.any(String) },
    })
    expect(validarProyecto({ ...base, leadId: VEHICULO })).toMatchObject({
      ok: true,
      datos: { leadId: VEHICULO },
    })
  })

  it('topa los textos largos con su campo', () => {
    const r = validarProyecto({
      ...BORRADOR_NUEVO_DE_PROYECTO,
      vehiculoEtiqueta: 'a'.repeat(121),
      notas: 'n'.repeat(2001),
    })
    expect(r).toMatchObject({
      ok: false,
      errores: { vehiculoEtiqueta: expect.any(String), notas: expect.any(String) },
    })
  })
})
