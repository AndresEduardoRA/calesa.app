import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  TEXTO_CON_RUEDA,
  TEXTO_SIN_RUEDA,
  TEXTO_SIN_SUMAR,
  TEXTO_VER_COMO,
  motivoSinInterruptor,
  puedeEstarEnLaRueda,
  textoDeLaRueda,
} from './rueda'

const con: Permisos = [{ clave: 'web.cola.participar', origenId: null, alcance: 'todos' }]
// Gestionar la cola no es recibir turnos: son dos permisos.
const otroDeLaCola: Permisos = [{ clave: 'web.cola.gestionar', origenId: null, alcance: 'todos' }]

describe('puedeEstarEnLaRueda', () => {
  it('es el permiso web.cola.participar y ninguno más', () => {
    expect(puedeEstarEnLaRueda(con)).toBe(true)
    expect(puedeEstarEnLaRueda(otroDeLaCola)).toBe(false)
    expect(puedeEstarEnLaRueda([])).toBe(false)
  })

  it('vale con el permiso acotado a un origen o a lo propio: la rueda no distingue orígenes', () => {
    expect(
      puedeEstarEnLaRueda([{ clave: 'web.cola.participar', origenId: 'o1', alcance: 'propios' }]),
    ).toBe(true)
  })
})

describe('textoDeLaRueda', () => {
  it('dice cada caso con su frase', () => {
    expect(textoDeLaRueda(con)).toBe(TEXTO_CON_RUEDA)
    expect(textoDeLaRueda([])).toBe(TEXTO_SIN_RUEDA)
    expect(TEXTO_SIN_RUEDA).toBe('Tu rol no recibe turnos de la web.')
  })
})

describe('motivoSinInterruptor', () => {
  it('sin el permiso del rol, el motivo es el del rol (aunque esté habilitada)', () => {
    expect(motivoSinInterruptor({ permisos: [], habilitado: true, miraOtroRol: false })).toBe(
      TEXTO_SIN_RUEDA,
    )
  })

  it('con el permiso pero sin que la sumen a la rueda, lo dice', () => {
    expect(motivoSinInterruptor({ permisos: con, habilitado: false, miraOtroRol: false })).toBe(
      TEXTO_SIN_SUMAR,
    )
  })

  it('mirando otro rol no se puede mover, y eso pesa más que no estar sumada', () => {
    expect(motivoSinInterruptor({ permisos: con, habilitado: false, miraOtroRol: true })).toBe(
      TEXTO_VER_COMO,
    )
  })

  it('con permiso, sumada y sin «Ver como» se puede', () => {
    expect(motivoSinInterruptor({ permisos: con, habilitado: true, miraOtroRol: false })).toBeNull()
  })
})
