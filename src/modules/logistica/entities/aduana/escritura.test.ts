import { describe, expect, it } from 'vitest'
import type { DeclaracionLeida } from './declaracion'
import {
  borradorDeDeclaracion,
  borradorNuevoDeDeclaracion,
  cambiosDeDeclaracion,
  motivoParaNoGuardarVehiculos,
  validarDeclaracion,
} from './escritura'

const ORIGINAL: DeclaracionLeida = {
  id: '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70',
  numero: 'DUI-1',
  canal: null,
  aceptadaEl: '2026-11-01',
  venceTributosEl: null,
  despachante: 'Ana',
  deposito: null,
  creadoEn: '2026-11-01T10:00:00Z',
  actualizadoEn: '2026-11-01T10:00:00Z',
  notas: null,
  hayOcultos: false,
  pagada: false,
  faltan: 0,
  hayMas: false,
  vehiculos: [],
}

function validar(cambios: Partial<ReturnType<typeof borradorNuevoDeDeclaracion>>) {
  return validarDeclaracion({ ...borradorNuevoDeDeclaracion(), numero: 'X-1', ...cambios })
}

describe('validarDeclaracion', () => {
  it('pide el número y lo recorta', () => {
    expect(validar({ numero: '   ' })).toEqual({
      ok: false,
      errores: { numero: 'El número es obligatorio.' },
    })
    const ok = validar({ numero: '  DUI 9 ' })
    expect(ok.ok && ok.datos.numero).toBe('DUI 9')
  })

  it('limita el número a 60 caracteres', () => {
    expect(validar({ numero: 'a'.repeat(61) }).ok).toBe(false)
    expect(validar({ numero: 'a'.repeat(60) }).ok).toBe(true)
  })

  it('rechaza fechas que no existen y deja vacío como nulo', () => {
    expect(validar({ aceptadaEl: '2026-02-30' })).toMatchObject({
      ok: false,
      errores: { aceptadaEl: 'Escribe una fecha válida.' },
    })
    expect(validar({ venceTributosEl: 'mañana' }).ok).toBe(false)
    const ok = validar({ aceptadaEl: '', despachante: '  ' })
    expect(ok.ok && ok.datos.aceptadaEl).toBeNull()
    expect(ok.ok && ok.datos.despachante).toBeNull()
  })

  it('topa despachante, depósito y notas', () => {
    const r = validar({
      despachante: 'a'.repeat(201),
      deposito: 'a'.repeat(201),
      notas: 'a'.repeat(2001),
    })
    expect(r.ok ? [] : Object.keys(r.errores)).toEqual(['despachante', 'deposito', 'notas'])
  })
})

describe('cambiosDeDeclaracion', () => {
  it('en el alta manda lo que tiene valor y el número', () => {
    const v = validar({ numero: 'N-1', despachante: 'Luis' })
    expect(v.ok && cambiosDeDeclaracion(null, v.datos)).toEqual({
      numero: 'N-1',
      despachante: 'Luis',
    })
  })

  it('al editar manda sólo lo que cambió y null para vaciar', () => {
    const v = validarDeclaracion({
      ...borradorDeDeclaracion(ORIGINAL),
      despachante: '',
      notas: 'hola',
    })
    expect(v.ok && cambiosDeDeclaracion(ORIGINAL, v.datos)).toEqual({
      despachante: null,
      notas: 'hola',
    })
  })

  it('sin diferencia no hay nada que guardar', () => {
    const v = validarDeclaracion(borradorDeDeclaracion(ORIGINAL))
    expect(v.ok && cambiosDeDeclaracion(ORIGINAL, v.datos)).toBeNull()
  })
})

describe('motivoParaNoGuardarVehiculos', () => {
  it('sin cambios lo dice y con cambios deja guardar', () => {
    expect(motivoParaNoGuardarVehiculos({ agregar: [], quitar: [] })).toBe(
      'No hay cambios en los vehículos.',
    )
    expect(motivoParaNoGuardarVehiculos({ agregar: ['a'], quitar: [] })).toBeNull()
  })

  it('hasta 200 entre las dos listas', () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => String(i))
    expect(motivoParaNoGuardarVehiculos({ agregar: ids(150), quitar: ids(50) })).toBeNull()
    expect(motivoParaNoGuardarVehiculos({ agregar: ids(150), quitar: ids(51) })).toBe(
      'Hasta 200 vehículos por vez.',
    )
  })
})
