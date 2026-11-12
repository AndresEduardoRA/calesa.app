import { describe, expect, it } from 'vitest'
import { validarEspera } from './formulario-de-espera'
import type { FaseDelOtroFlujo } from './opciones'

const fases: FaseDelOtroFlujo[] = [{ id: 'f1', nombre: 'Recibido', flujo: 'Repuestos' }]

describe('validarEspera', () => {
  it('con una fase de las ofrecidas pasa, con sus notas recortadas', () => {
    expect(validarEspera({ faseId: 'f1', notas: ' x ' }, fases)).toEqual({
      ok: true,
      datos: { espera_fase_id: 'f1', notas: 'x' },
    })
    expect(validarEspera({ faseId: 'f1', notas: '' }, fases)).toEqual({
      ok: true,
      datos: { espera_fase_id: 'f1' },
    })
  })

  it('pide la fase y rechaza una que no se ofreció', () => {
    expect(validarEspera({ faseId: '', notas: '' }, fases)).toMatchObject({
      ok: false,
      errores: { espera_fase_id: 'Elige la fase que se espera.' },
    })
    expect(validarEspera({ faseId: 'otra', notas: '' }, fases)).toMatchObject({
      ok: false,
      errores: { espera_fase_id: expect.any(String) as string },
    })
  })

  it('las notas largas se rechazan', () => {
    expect(validarEspera({ faseId: 'f1', notas: 'a'.repeat(501) }, fases)).toMatchObject({
      ok: false,
      errores: { notas: expect.any(String) as string },
    })
  })
})
