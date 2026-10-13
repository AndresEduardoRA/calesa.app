import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  candidatosPorCartera,
  origenElegido,
  origenesVisibles,
  permisoDeAlta,
  puedeEditar,
} from './permisos'

const COREA = { id: 'corea', nombre: 'Corea', activo: true }
const OFICINA = { id: 'oficina', nombre: 'Oficina', activo: true }
const VIEJO = { id: 'viejo', nombre: 'Viejo', activo: false }
const ORIGENES = [COREA, OFICINA, VIEJO]

const en = (
  clave: Permisos[number]['clave'],
  origenId: string | null,
  alcance: 'todos' | 'propios' = 'todos',
): Permisos => [{ clave, origenId, alcance }]

describe('origenesVisibles', () => {
  it('sin el permiso no ve ninguna pestaña', () => {
    expect(origenesVisibles([], ORIGENES)).toEqual([])
    expect(origenesVisibles(en('vehiculos.crear', null), ORIGENES)).toEqual([])
  })

  it('con el permiso en un origen ve sólo ése', () => {
    expect(origenesVisibles(en('vehiculos.ver', 'oficina'), ORIGENES)).toEqual([OFICINA])
  })

  it('sin origen en la concesión los ve todos, también los desactivados', () => {
    expect(origenesVisibles(en('vehiculos.ver', null), ORIGENES)).toEqual(ORIGENES)
  })
})

describe('origenElegido', () => {
  it('el de la URL si es de los suyos; si no, el primero', () => {
    expect(origenElegido(ORIGENES, 'oficina')).toBe(OFICINA)
    expect(origenElegido(ORIGENES, 'inventado')).toBe(COREA)
    expect(origenElegido(ORIGENES, undefined)).toBe(COREA)
    expect(origenElegido([OFICINA], 'corea')).toBe(OFICINA)
    expect(origenElegido([], 'corea')).toBeNull()
  })
})

describe('permisoDeAlta', () => {
  it('sin el permiso en ese origen el botón no existe', () => {
    expect(permisoDeAlta(en('vehiculos.crear', 'oficina'), COREA)).toEqual({ estado: 'oculto' })
  })

  it('con el permiso se puede, salvo en un origen desactivado, que lo dice', () => {
    expect(permisoDeAlta(en('vehiculos.crear', null), COREA)).toEqual({ estado: 'habilitado' })
    const apagado = permisoDeAlta(en('vehiculos.crear', null), VIEJO)
    expect(apagado.estado).toBe('deshabilitado')
    expect(apagado).toMatchObject({ motivo: expect.stringContaining('Viejo está desactivado') })
  })
})

describe('puedeEditar', () => {
  const mio = { origenId: 'corea', creadoPor: 'yo' }
  const ajeno = { origenId: 'corea', creadoPor: 'otra' }

  it('con alcance «todos» edita cualquiera de ese origen', () => {
    expect(puedeEditar(en('vehiculos.editar', 'corea'), ajeno, 'yo')).toBe(true)
    expect(puedeEditar(en('vehiculos.editar', 'oficina'), ajeno, 'yo')).toBe(false)
  })

  it('con alcance «propios», sólo lo que creó', () => {
    const propios = en('vehiculos.editar', null, 'propios')
    expect(puedeEditar(propios, mio, 'yo')).toBe(true)
    expect(puedeEditar(propios, ajeno, 'yo')).toBe(false)
  })

  it('con alcance «propios», también lo que la base dice (vinculado a un lead de su cartera)', () => {
    const propios = en('vehiculos.editar', null, 'propios')
    expect(puedeEditar(propios, ajeno, 'yo', true)).toBe(true)
  })

  it('sin el permiso, nada, diga lo que diga la base', () => {
    expect(puedeEditar(en('vehiculos.ver', null), mio, 'yo')).toBe(false)
    expect(puedeEditar(en('vehiculos.ver', null), ajeno, 'yo', true)).toBe(false)
  })
})

describe('candidatosPorCartera', () => {
  const vehiculo = (id: string, creadoPor: string, leadId: string | null, origenId = 'corea') => ({
    id,
    origenId,
    creadoPor,
    leadId,
  })
  const flota = [
    vehiculo('mio', 'yo', 'lead'),
    vehiculo('ajeno-vinculado', 'otra', 'lead'),
    vehiculo('ajeno-suelto', 'otra', null),
  ]

  it('con alcance «propios»: lo ajeno que tiene un vínculo', () => {
    const propios = en('vehiculos.editar', null, 'propios')
    expect(candidatosPorCartera(propios, flota, 'yo')).toEqual(['ajeno-vinculado'])
  })

  it('con alcance «todos» o sin el permiso no hay nada que preguntar', () => {
    expect(candidatosPorCartera(en('vehiculos.editar', null), flota, 'yo')).toEqual([])
    expect(candidatosPorCartera(en('vehiculos.ver', null), flota, 'yo')).toEqual([])
  })

  it('el alcance se mira por origen', () => {
    const soloOficina = en('vehiculos.editar', 'oficina', 'propios')
    expect(candidatosPorCartera(soloOficina, flota, 'yo')).toEqual([])
  })
})
