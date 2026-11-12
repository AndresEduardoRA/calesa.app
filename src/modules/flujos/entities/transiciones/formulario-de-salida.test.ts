import { describe, expect, it } from 'vitest'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../flujo'
import {
  LARGO_MAXIMO_DE_ACCION,
  destinosDisponibles,
  entradasDe,
  motivoSinDestinos,
  salidasDe,
  validarSalida,
} from './formulario-de-salida'

const ids = ['a', 'b', 'c', 'd'].map((x, i) =>
  `${String(i + 1).repeat(8)}-1111-4111-8111-111111111111${x}`.slice(0, 36),
)
const [A, B, C, D] = ids as [string, string, string, string]

const fase = (id: string, orden: number, activa = true): FaseParaConfigurar =>
  ({ id, nombre: `F${String(orden)}`, orden, activa, color: '#111111' }) as FaseParaConfigurar

function flujo(parcial: Partial<FlujoParaConfigurar>): FlujoParaConfigurar {
  return {
    fases: [fase(A, 10), fase(B, 20), fase(C, 30), fase(D, 40, false)],
    transiciones: [],
    ...parcial,
  } as FlujoParaConfigurar
}

const t = (id: string, de: string, a: string) => ({
  id,
  deFaseId: de,
  aFaseId: a,
  accion: null,
  notaObligatoria: false,
})

describe('destinosDisponibles', () => {
  it('son las activas, sin la propia y sin las que ya son salida', () => {
    expect(destinosDisponibles(flujo({}), A).map((f) => f.id)).toEqual([B, C])
    expect(
      destinosDisponibles(flujo({ transiciones: [t('t1', A, B)] }), A).map((f) => f.id),
    ).toEqual([C])
  })

  it('sin ninguna, dice por qué', () => {
    const todas = flujo({ transiciones: [t('t1', A, B), t('t2', A, C)] })
    expect(destinosDisponibles(todas, A)).toEqual([])
    expect(motivoSinDestinos(todas, A)).toBe('Ya sacas a todas las fases activas.')
    expect(motivoSinDestinos(flujo({ fases: [fase(A, 10)] }), A)).toBe(
      'No hay otra fase activa a la que salir.',
    )
    expect(motivoSinDestinos(flujo({}), A)).toBeNull()
  })
})

describe('salidasDe y entradasDe', () => {
  it('las salidas van en el orden de su fase destino', () => {
    const f = flujo({ transiciones: [t('t2', A, C), t('t1', A, B), t('t3', B, C)] })
    expect(salidasDe(f, A).map((x) => x.id)).toEqual(['t1', 't2'])
    expect(entradasDe(f, C).map((x) => x.id)).toEqual([A, B])
  })
})

describe('validarSalida', () => {
  const disponibles = [fase(B, 20)]

  it('pide un destino ofrecido', () => {
    expect(
      validarSalida({ aFaseId: '', accion: '', notaObligatoria: false }, disponibles),
    ).toMatchObject({ ok: false, errores: { a_fase_id: 'Elige la fase destino.' } })
    expect(validarSalida({ aFaseId: C, accion: '', notaObligatoria: false }, disponibles).ok).toBe(
      false,
    )
  })

  it('una acción vacía o de espacios queda nula y se recorta', () => {
    expect(
      validarSalida({ aFaseId: B, accion: '   ', notaObligatoria: true }, disponibles),
    ).toEqual({ ok: true, datos: { aFaseId: B, accion: null, notaObligatoria: true } })
    expect(
      validarSalida({ aFaseId: B, accion: '  Embarcar ', notaObligatoria: false }, disponibles),
    ).toMatchObject({ ok: true, datos: { accion: 'Embarcar' } })
  })

  it('41 caracteres no pasan; 40 sí', () => {
    const justa = 'x'.repeat(LARGO_MAXIMO_DE_ACCION)
    expect(
      validarSalida({ aFaseId: B, accion: justa, notaObligatoria: false }, disponibles).ok,
    ).toBe(true)
    expect(
      validarSalida({ aFaseId: B, accion: `${justa}x`, notaObligatoria: false }, disponibles),
    ).toMatchObject({ ok: false, errores: { accion: expect.any(String) as string } })
  })
})
