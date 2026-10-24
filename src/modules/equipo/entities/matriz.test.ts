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
  ordenarPermisosDeNivel,
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

// Los permisos de un nivel de acceso (D7): la base los entrega con el nivel embebido por la FK, todos con `orden` 700 y 701.
const filaDeNivel = (
  clave: string,
  accion: 'ver' | 'editar',
  nombre: string,
  retirado_en: string | null = null,
) => ({
  clave: `cotizaciones.nivel.${clave}.${accion}`,
  nombre: `${accion === 'ver' ? 'Ver' : 'Editar'} el nivel «${nombre}»`,
  descripcion: 'Qué ve o edita quien lo tiene',
  por_origen: true,
  con_alcance: false,
  nivel_clave: clave,
  cotizaciones_niveles: { nombre, retirado_en },
})

describe('permisos de un nivel de acceso', () => {
  // Llegan en el orden en que la base empata (700 y 701 para todos), a propósito mezclados.
  const delNivel = catalogoDesde([
    filas[0],
    { ...filas[2], clave: 'cotizaciones.ver', nombre: 'Ver cotizaciones' },
    filaDeNivel('zeta', 'ver', 'Zeta'),
    filaDeNivel('costos', 'ver', 'Costos'),
    filaDeNivel('nandu', 'ver', 'Ñandú'),
    filaDeNivel('zeta', 'editar', 'Zeta'),
    filaDeNivel('costos', 'editar', 'Costos'),
    filaDeNivel('nandu', 'editar', 'Ñandú'),
    filaDeNivel('alamo', 'editar', 'Álamo', '2026-10-24T10:00:00Z'),
    filaDeNivel('alamo', 'ver', 'Álamo', '2026-10-24T10:00:00Z'),
  ])

  it('los reconoce, con su nivel, y los pone en «Cotizaciones» por nombre y «Ver» antes de «Editar»', () => {
    const grupo = agruparPorModulo(delNivel).find((g) => g.modulo === 'cotizaciones')
    expect(grupo?.permisos.map((p) => p.clave)).toEqual([
      'cotizaciones.ver',
      'cotizaciones.nivel.alamo.ver',
      'cotizaciones.nivel.alamo.editar',
      'cotizaciones.nivel.costos.ver',
      'cotizaciones.nivel.costos.editar',
      'cotizaciones.nivel.nandu.ver',
      'cotizaciones.nivel.nandu.editar',
      'cotizaciones.nivel.zeta.ver',
      'cotizaciones.nivel.zeta.editar',
    ])
  })

  it('lleva el nombre del nivel, y un retirado lo dice en el nombre sin dejar de aparecer', () => {
    const grupo = agruparPorModulo(delNivel).find((g) => g.modulo === 'cotizaciones')
    const nombres = grupo?.permisos.map((p) => p.nombre)
    expect(nombres).toContain('Ver el nivel «Costos»')
    expect(nombres).toContain('Ver el nivel «Álamo» (retirado)')
    expect(nombres).toContain('Editar el nivel «Álamo» (retirado)')
    const costos = delNivel.find((p) => p.clave === 'cotizaciones.nivel.costos.ver')
    expect(costos).toMatchObject({
      modulo: 'cotizaciones',
      porOrigen: true,
      conAlcance: false,
      nivel: { clave: 'costos', nombre: 'Costos', retirado: false },
    })
    expect(delNivel.find((p) => p.clave === 'cotizaciones.nivel.alamo.ver')?.nivel?.retirado).toBe(
      true,
    )
    // Un permiso de nivel no se acota por alcance: por origen y sin más.
    expect(esSimple(costos as PermisoDelCatalogo)).toBe(false)
  })
})

describe('permisos de un nivel de acceso: lo que no se mueve', () => {
  const delNivel = catalogoDesde([
    filas[0],
    { ...filas[2], clave: 'cotizaciones.ver', nombre: 'Ver cotizaciones' },
    filaDeNivel('zeta', 'ver', 'Zeta'),
    filaDeNivel('alamo', 'ver', 'Álamo'),
  ])

  it('no mueve a los demás permisos', () => {
    expect(delNivel.slice(0, 3).map((p) => p.clave)).toEqual([
      'equipo.roles.gestionar',
      'cotizaciones.ver',
      'cotizaciones.nivel.alamo.ver',
    ])
    expect(ordenarPermisosDeNivel(catalogo).map((p) => p.clave)).toEqual(
      catalogo.map((p) => p.clave),
    )
  })

  it('ordena por el nombre del nivel y no por su clave', () => {
    const resultado = catalogoDesde([
      filaDeNivel('a_ultimo', 'ver', 'Zeta final'),
      filaDeNivel('z_primero', 'ver', 'Álamo primero'),
    ])
    expect(resultado.map((p) => p.clave)).toEqual([
      'cotizaciones.nivel.z_primero.ver',
      'cotizaciones.nivel.a_ultimo.ver',
    ])
  })

  it('es estable: el mismo orden venga como venga', () => {
    const invertido = catalogoDesde(
      [
        filaDeNivel('zeta', 'editar', 'Zeta'),
        filaDeNivel('costos', 'editar', 'Costos'),
        filaDeNivel('zeta', 'ver', 'Zeta'),
        filaDeNivel('costos', 'ver', 'Costos'),
      ].reverse(),
    )
    expect(invertido.map((p) => p.clave)).toEqual([
      'cotizaciones.nivel.costos.ver',
      'cotizaciones.nivel.costos.editar',
      'cotizaciones.nivel.zeta.ver',
      'cotizaciones.nivel.zeta.editar',
    ])
  })

  it('descarta una clave de nivel mal formada y un nivel que no viene embebido no rompe', () => {
    const resultado = catalogoDesde([
      { ...filaDeNivel('costos', 'ver', 'Costos'), clave: 'cotizaciones.nivel.todos.ver' },
      { ...filaDeNivel('costos', 'ver', 'Costos'), clave: 'cotizaciones.nivel.costos.borrar' },
      { ...filaDeNivel('gerencia', 'ver', 'Gerencia'), cotizaciones_niveles: null },
    ])
    expect(resultado.map((p) => p.clave)).toEqual(['cotizaciones.nivel.gerencia.ver'])
    expect(resultado[0]?.nivel).toBeUndefined()
  })
})
