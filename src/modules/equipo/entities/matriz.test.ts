import { describe, expect, it } from 'vitest'
import type { Concesion } from '@/shared/lib/permisos'
import {
  SIN_ORIGENES,
  TODOS_LOS_ORIGENES,
  agruparPorModulo,
  catalogoDesde,
  concesionesDelPermiso,
  esSimple,
  lugaresDe,
  resumenDeCelda,
  type PermisoDelCatalogo,
} from './matriz'

const OFICINA = '11111111-1111-1111-1111-111111111111'
const USA = '22222222-2222-2222-2222-222222222222'
const origenes = [
  { id: OFICINA, nombre: 'Oficina' },
  { id: USA, nombre: 'Subasta EE. UU.' },
]

const filas = [
  {
    clave: 'equipo.roles.gestionar',
    nombre: 'Gestionar roles',
    descripcion: 'Crear roles',
    por_origen: false,
    con_alcance: false,
  },
  {
    clave: 'vehiculos.ver',
    nombre: 'Ver vehículos',
    descripcion: 'Ver el inventario',
    por_origen: true,
    con_alcance: true,
  },
  {
    clave: 'leads.ver',
    nombre: 'Ver leads',
    descripcion: 'Ver leads',
    por_origen: false,
    con_alcance: true,
  },
  {
    clave: 'vehiculos.crear',
    nombre: 'Crear vehículos',
    descripcion: 'Dar de alta',
    por_origen: true,
    con_alcance: false,
  },
  {
    clave: 'permiso.que.no.existe',
    nombre: '—',
    descripcion: '—',
    por_origen: false,
    con_alcance: false,
  },
]
const catalogo = catalogoDesde(filas)
const permiso = (clave: string): PermisoDelCatalogo => {
  const encontrado = catalogo.find((p) => p.clave === clave)
  if (!encontrado) {
    throw new Error(`falta ${clave}`)
  }
  return encontrado
}

describe('catalogoDesde', () => {
  it('tipa las filas y descarta la clave que el catálogo no conoce', () => {
    expect(catalogo.map((p) => p.clave)).toEqual([
      'equipo.roles.gestionar',
      'vehiculos.ver',
      'leads.ver',
      'vehiculos.crear',
    ])
    expect(permiso('vehiculos.ver')).toEqual({
      clave: 'vehiculos.ver',
      modulo: 'vehiculos',
      nombre: 'Ver vehículos',
      descripcion: 'Ver el inventario',
      porOrigen: true,
      conAlcance: true,
    })
  })
})

describe('agruparPorModulo', () => {
  it('arma un grupo por módulo, con su título y en el orden del catálogo de módulos', () => {
    const grupos = agruparPorModulo(catalogo)
    expect(grupos.map((g) => [g.titulo, g.permisos.map((p) => p.clave)])).toEqual([
      ['Equipo', ['equipo.roles.gestionar']],
      ['Vehículos', ['vehiculos.ver', 'vehiculos.crear']],
      ['Leads', ['leads.ver']],
    ])
  })
})

describe('esSimple', () => {
  it('sólo si no se acota por origen ni distingue alcance', () => {
    expect(esSimple(permiso('equipo.roles.gestionar'))).toBe(true)
    expect(esSimple(permiso('leads.ver'))).toBe(false)
    expect(esSimple(permiso('vehiculos.crear'))).toBe(false)
  })
})

describe('lugaresDe', () => {
  it('un permiso por origen se da en general o en cada origen', () => {
    expect(lugaresDe(permiso('vehiculos.ver'), origenes)).toEqual([
      { origenId: null, etiqueta: TODOS_LOS_ORIGENES },
      { origenId: OFICINA, etiqueta: 'Oficina' },
      { origenId: USA, etiqueta: 'Subasta EE. UU.' },
    ])
  })

  it('con cero orígenes sólo ofrece el alcance global', () => {
    expect(lugaresDe(permiso('vehiculos.ver'), [])).toEqual([
      { origenId: null, etiqueta: TODOS_LOS_ORIGENES },
    ])
    expect(SIN_ORIGENES).toBe('Sin orígenes todavía')
  })

  it('un permiso que no se acota por origen sólo se da en general', () => {
    expect(lugaresDe(permiso('leads.ver'), origenes)).toEqual([
      { origenId: null, etiqueta: 'En toda la empresa' },
    ])
  })
})

describe('resumenDeCelda', () => {
  const de = (
    clave: 'vehiculos.ver' | 'leads.ver' | 'vehiculos.crear',
    ...c: Omit<Concesion, 'clave'>[]
  ) =>
    resumenDeCelda(
      permiso(clave),
      c.map((x) => ({ ...x, clave })),
      origenes,
    )

  it('sin concesiones dice que no', () => {
    expect(de('vehiculos.ver')).toBe('No')
  })

  it('en general dice el alcance, o sí si no lo distingue', () => {
    expect(de('vehiculos.ver', { origenId: null, alcance: 'todos' })).toBe('Todo')
    expect(de('leads.ver', { origenId: null, alcance: 'propios' })).toBe('Lo propio')
    expect(de('vehiculos.crear', { origenId: null, alcance: 'todos' })).toBe('Sí')
  })

  it('en un origen lo nombra; en varios los cuenta', () => {
    expect(de('vehiculos.ver', { origenId: OFICINA, alcance: 'propios' })).toBe(
      'Oficina · lo propio',
    )
    expect(de('vehiculos.crear', { origenId: OFICINA, alcance: 'todos' })).toBe('Oficina')
    expect(
      de(
        'vehiculos.ver',
        { origenId: OFICINA, alcance: 'todos' },
        { origenId: USA, alcance: 'todos' },
      ),
    ).toBe('2 orígenes')
  })

  it('un origen que ya no está en la lista no se nombra', () => {
    expect(
      de('vehiculos.crear', { origenId: '33333333-3333-3333-3333-333333333333', alcance: 'todos' }),
    ).toBe('Un origen')
  })
})

describe('concesionesDelPermiso', () => {
  it('se queda con las de esa clave', () => {
    const todas: Concesion[] = [
      { clave: 'leads.ver', origenId: null, alcance: 'todos' },
      { clave: 'vehiculos.ver', origenId: OFICINA, alcance: 'todos' },
    ]
    expect(concesionesDelPermiso(todas, 'vehiculos.ver')).toEqual([todas[1]])
  })
})
