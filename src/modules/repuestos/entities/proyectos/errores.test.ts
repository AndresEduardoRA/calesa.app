import { describe, expect, it } from 'vitest'
import { rechazoDeProyecto } from './errores'

describe('rechazoDeProyecto', () => {
  it('un vehículo que ya tiene proyecto va junto al campo del vehículo', () => {
    const r = rechazoDeProyecto({
      code: '23505',
      message: 'Ese vehículo ya tiene un proyecto.',
      hint: 'vehiculo_id',
    })
    expect(r).toMatchObject({
      ok: false,
      error: { codigo: 'duplicado', mensaje: 'Ese vehículo ya tiene un proyecto.' },
      porCampo: { vehiculoId: 'Ese vehículo ya tiene un proyecto.' },
    })
  })

  it('sin etiqueta la base dice qué escribir y va junto al campo', () => {
    const r = rechazoDeProyecto({
      code: '22023',
      message: 'Escribe qué vehículo es.',
      hint: 'vehiculo_etiqueta',
    })
    expect(r).toMatchObject({ porCampo: { vehiculoEtiqueta: 'Escribe qué vehículo es.' } })
  })

  it('el identificador repetido no apunta a ningún campo', () => {
    const r = rechazoDeProyecto({
      code: '23505',
      message: 'Ese identificador ya está en uso.',
      hint: 'id',
    })
    expect(r.ok).toBe(false)
    expect('porCampo' in r).toBe(false)
  })

  it('un error técnico no se muestra tal cual', () => {
    const r = rechazoDeProyecto({ code: 'XX000', message: 'relation does not exist', hint: 'vin' })
    expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
    expect('porCampo' in r).toBe(false)
  })
})
