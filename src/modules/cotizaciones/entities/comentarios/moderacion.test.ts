import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { accionesDeModerar, insigniaDeLaCotizacion, puedeModerarLaCotizacion } from './moderacion'

const MIAMI = '00000000-0000-4000-8000-000000000001'
const CHILE = '00000000-0000-4000-8000-000000000002'

const moderar: Permisos = [{ clave: 'cotizaciones.moderar', origenId: null, alcance: 'todos' }]
const moderarYFinalDeMiami: Permisos = [
  ...moderar,
  { clave: 'cotizaciones.final.gestionar', origenId: MIAMI, alcance: 'todos' },
]
const moderarYFinalDeChile: Permisos = [
  ...moderar,
  { clave: 'cotizaciones.final.gestionar', origenId: CHILE, alcance: 'todos' },
]
const soloFinal: Permisos = [
  { clave: 'cotizaciones.final.gestionar', origenId: null, alcance: 'todos' },
]

// El espejo de `cotizacion_moderar` (4.27-1): `moderar` global y, en una final, `final.gestionar` del origen.
describe('puedeModerarLaCotizacion', () => {
  it('una preventa la modera quien tiene `moderar`', () => {
    expect(puedeModerarLaCotizacion({ clase: 'preventa', origenId: MIAMI }, moderar)).toBe(true)
  })

  it('sin `moderar` no, aunque gestione finales', () => {
    expect(puedeModerarLaCotizacion({ clase: 'preventa', origenId: MIAMI }, [])).toBe(false)
    expect(puedeModerarLaCotizacion({ clase: 'final', origenId: MIAMI }, soloFinal)).toBe(false)
  })

  it('una final pide además `final.gestionar` de su origen', () => {
    expect(puedeModerarLaCotizacion({ clase: 'final', origenId: MIAMI }, moderar)).toBe(false)
    expect(
      puedeModerarLaCotizacion({ clase: 'final', origenId: MIAMI }, moderarYFinalDeMiami),
    ).toBe(true)
  })

  it('`final.gestionar` de otro origen no alcanza', () => {
    expect(
      puedeModerarLaCotizacion({ clase: 'final', origenId: MIAMI }, moderarYFinalDeChile),
    ).toBe(false)
  })
})

// P1 a: «Reportada» sólo para quien modera; «Inválida» para todos.
describe('insigniaDeLaCotizacion', () => {
  it('una inválida dice «Inválida», con y sin moderar', () => {
    const invalida = { estado: 'invalida', reportesCount: 2 } as const
    expect(insigniaDeLaCotizacion(invalida, true)).toEqual({
      texto: 'Inválida',
      tono: 'destructive',
    })
    expect(insigniaDeLaCotizacion(invalida, false)).toEqual({
      texto: 'Inválida',
      tono: 'destructive',
    })
  })

  it('una activa con reportes dice «Reportada» sólo a quien modera', () => {
    const reportada = { estado: 'activa', reportesCount: 1 } as const
    expect(insigniaDeLaCotizacion(reportada, true)).toEqual({
      texto: 'Reportada',
      tono: 'outline',
    })
    expect(insigniaDeLaCotizacion(reportada, false)).toBeNull()
  })

  it('una activa sin reportes no dice nada', () => {
    expect(insigniaDeLaCotizacion({ estado: 'activa', reportesCount: 0 }, true)).toBeNull()
  })

  it('el valor `reportada` del enum (sin uso) se lee como activa', () => {
    expect(insigniaDeLaCotizacion({ estado: 'reportada', reportesCount: 0 }, true)).toBeNull()
    expect(insigniaDeLaCotizacion({ estado: 'reportada', reportesCount: 3 }, true)?.texto).toBe(
      'Reportada',
    )
  })
})

// P2 a y P3 a: invalidar toda activa, descartar si tiene reportes, reactivar una inválida.
describe('accionesDeModerar', () => {
  it('una activa sin reportes sólo se invalida', () => {
    expect(accionesDeModerar({ estado: 'activa', reportesCount: 0 })).toEqual(['invalidar'])
  })

  it('una activa con reportes se invalida o se descartan sus reportes', () => {
    expect(accionesDeModerar({ estado: 'activa', reportesCount: 2 })).toEqual([
      'invalidar',
      'descartar',
    ])
  })

  it('una inválida sólo se reactiva', () => {
    expect(accionesDeModerar({ estado: 'invalida', reportesCount: 2 })).toEqual(['reactivar'])
  })
})
