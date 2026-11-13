import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  entidadElegida,
  opcionesDeImportar,
  origenElegido,
  puedeImportar,
  puedeImportarAlgo,
} from './opciones-de-importar'

const UNO = '33333333-3333-4333-8333-333333333333'
const DOS = '44444444-4444-4444-8444-444444444444'
const APAGADO = '55555555-5555-4555-8555-555555555555'

const ORIGENES = [
  { id: UNO, nombre: 'Japón', activo: true },
  { id: DOS, nombre: 'Chile', activo: true },
  { id: APAGADO, nombre: 'Viejo', activo: false },
]

const con = (...concesiones: [string, string | null][]) =>
  concesiones.map(([clave, origenId]) => ({ clave, origenId })) as unknown as Permisos

describe('opcionesDeImportar: quién importa qué', () => {
  it('sin permisos, nada', () => {
    const opciones = opcionesDeImportar(con(), ORIGENES)
    expect(opciones).toEqual({ leads: null, vehiculos: [] })
    expect(puedeImportar(opciones)).toBe(false)
    expect(puedeImportarAlgo(con())).toBe(false)
    expect(entidadElegida('leads', opciones)).toBeNull()
  })

  it('leads.crear: para sí; datos.importar.todo: para otra persona', () => {
    expect(opcionesDeImportar(con(['leads.crear', null]), ORIGENES).leads).toEqual({
      yo: true,
      otros: false,
    })
    expect(opcionesDeImportar(con(['datos.importar.todo', null]), ORIGENES).leads).toEqual({
      yo: false,
      otros: true,
    })
    expect(puedeImportarAlgo(con(['leads.crear', null]))).toBe(true)
    expect(puedeImportarAlgo(con(['datos.importar.todo', null]))).toBe(true)
  })

  it('vehiculos.crear: sólo sus orígenes y nunca uno inactivo', () => {
    const deUno = opcionesDeImportar(con(['vehiculos.crear', UNO]), ORIGENES)
    expect(deUno).toEqual({ leads: null, vehiculos: [{ id: UNO, nombre: 'Japón' }] })
    expect(puedeImportarAlgo(con(['vehiculos.crear', UNO]))).toBe(true)
    expect(opcionesDeImportar(con(['vehiculos.crear', APAGADO]), ORIGENES).vehiculos).toEqual([])
    expect(opcionesDeImportar(con(['vehiculos.crear', null]), ORIGENES).vehiculos).toEqual([
      { id: UNO, nombre: 'Japón' },
      { id: DOS, nombre: 'Chile' },
    ])
  })

  it('la entidad y el origen pedidos sólo si se pueden', () => {
    const soloVehiculos = opcionesDeImportar(con(['vehiculos.crear', UNO]), ORIGENES)
    expect(entidadElegida('leads', soloVehiculos)).toBe('vehiculos')
    const soloLeads = opcionesDeImportar(con(['leads.crear', null]), ORIGENES)
    expect(entidadElegida('vehiculos', soloLeads)).toBe('leads')
    expect(entidadElegida(undefined, soloLeads)).toBe('leads')
    const todo = opcionesDeImportar(con(['leads.crear', null], ['vehiculos.crear', null]), ORIGENES)
    expect(entidadElegida('vehiculos', todo)).toBe('vehiculos')
    expect(origenElegido(UNO, soloVehiculos)).toBe(UNO)
    expect(origenElegido(DOS, soloVehiculos)).toBeNull()
    expect(origenElegido(APAGADO, todo)).toBeNull()
    expect(origenElegido(undefined, todo)).toBeNull()
  })
})
