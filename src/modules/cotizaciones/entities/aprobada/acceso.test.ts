import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  ES_INVALIDA,
  SIN_LECTURA,
  SIN_VEHICULO,
  motivoParaNoAprobar,
  puedeAprobar,
  puedeAprobarAlguna,
} from './acceso'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '22222222-2222-4222-8222-222222222222'
const VEHICULO = '33333333-3333-4333-8333-333333333333'

const con = (clave: string, origenId: string | null = null): Permisos =>
  [{ clave, origenId, alcance: 'todos' as const }] as Permisos

describe('puedeAprobar', () => {
  it('con la clave de su origen o de todos', () => {
    expect(puedeAprobar({ origenId: ORIGEN }, con('cotizaciones.aprobar', ORIGEN))).toBe(true)
    expect(puedeAprobar({ origenId: ORIGEN }, con('cotizaciones.aprobar'))).toBe(true)
  })

  it('con la clave de otro origen, o con otra clave, no', () => {
    expect(puedeAprobar({ origenId: ORIGEN }, con('cotizaciones.aprobar', OTRO_ORIGEN))).toBe(false)
    expect(puedeAprobar({ origenId: ORIGEN }, con('cotizaciones.final.gestionar'))).toBe(false)
    expect(puedeAprobar({ origenId: ORIGEN }, [])).toBe(false)
  })
})

describe('puedeAprobarAlguna', () => {
  it('con la clave en algún origen', () => {
    expect(puedeAprobarAlguna(con('cotizaciones.aprobar', OTRO_ORIGEN))).toBe(true)
  })

  it('sin la clave, no', () => {
    expect(puedeAprobarAlguna(con('cotizaciones.final.gestionar'))).toBe(false)
  })
})

describe('motivoParaNoAprobar', () => {
  it('con vehículo y activa o reportada, se puede', () => {
    expect(motivoParaNoAprobar({ vehiculoId: VEHICULO }, { estado: 'activa' })).toBeNull()
    expect(motivoParaNoAprobar({ vehiculoId: VEHICULO }, { estado: 'reportada' })).toBeNull()
  })

  it('sin vehículo, primero eso', () => {
    expect(motivoParaNoAprobar({ vehiculoId: null }, { estado: 'invalida' })).toBe(SIN_VEHICULO)
  })

  it('inválida, no', () => {
    expect(motivoParaNoAprobar({ vehiculoId: VEHICULO }, { estado: 'invalida' })).toBe(ES_INVALIDA)
  })

  it('sin la lectura de la marca, no se adivina', () => {
    expect(motivoParaNoAprobar({ vehiculoId: VEHICULO }, null)).toBe(SIN_LECTURA)
  })
})
