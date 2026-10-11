import { describe, expect, it } from 'vitest'
import {
  claveDeRol,
  motivoDeNoEliminar,
  personasConElRol,
  rolesDesde,
  versionMasNueva,
} from './rol'

describe('claveDeRol', () => {
  it('arma la clave con la forma que exige la base', () => {
    expect(claveDeRol('Jefa de Ventas')).toBe('jefa_de_ventas')
    expect(claveDeRol('Logística / Aduana')).toBe('logistica_aduana')
    expect(claveDeRol('  RRHH  ')).toBe('rrhh')
  })

  it('empieza con letra y no pasa del largo máximo', () => {
    expect(claveDeRol('2do turno')).toBe('do_turno')
    expect(claveDeRol('a'.repeat(80))).toHaveLength(41)
    expect(claveDeRol(`${'a'.repeat(40)} b`)).toBe('a'.repeat(40))
  })

  it('devuelve null si del nombre no sale una clave', () => {
    expect(claveDeRol('123')).toBeNull()
    expect(claveDeRol('¡!')).toBeNull()
    expect(claveDeRol('x')).toBeNull()
  })
})

describe('rolesDesde', () => {
  it('da forma a los roles con sus concesiones y su cuenta de personas', () => {
    const filas = [
      {
        id: '00000000-0000-0000-0000-0000000000aa',
        clave: 'asesor',
        nombre: 'Asesor',
        color: '#027a48',
        es_sistema: false,
        actualizado_en: '2026-10-11T15:00:00.123456+00:00',
        roles_permisos: [
          { permiso_clave: 'leads.ver', origen_id: null, alcance: 'propios' },
          { permiso_clave: 'permiso.que.no.existe', origen_id: null, alcance: 'todos' },
        ],
        usuarios_roles: [{ count: 3 }],
      },
    ]
    expect(rolesDesde(filas)).toEqual([
      {
        id: '00000000-0000-0000-0000-0000000000aa',
        clave: 'asesor',
        nombre: 'Asesor',
        color: '#027a48',
        esSistema: false,
        actualizadoEn: '2026-10-11T15:00:00.123456+00:00',
        concesiones: [{ clave: 'leads.ver', origenId: null, alcance: 'propios' }],
        personas: 3,
      },
    ])
  })
})

describe('versionMasNueva', () => {
  it('se queda con la más reciente', () => {
    const vieja = '2026-10-11T15:00:00.123456+00:00'
    const nueva = '2026-10-11T15:00:01.000001+00:00'
    expect(versionMasNueva(vieja, nueva)).toBe(nueva)
    expect(versionMasNueva(nueva, vieja)).toBe(nueva)
    expect(versionMasNueva(vieja, undefined)).toBe(vieja)
  })
})

describe('motivoDeNoEliminar', () => {
  it('un rol propio, que domino y sin personas, se puede eliminar', () => {
    expect(motivoDeNoEliminar({ esSistema: false, personas: 0 }, true)).toBeNull()
  })

  it('dice por qué no: de sistema, no lo domino o alguien lo tiene', () => {
    expect(motivoDeNoEliminar({ esSistema: true, personas: 0 }, true)).toBe(
      'Un rol de sistema no se elimina.',
    )
    expect(motivoDeNoEliminar({ esSistema: false, personas: 0 }, false)).toContain(
      'permisos que tú no tienes',
    )
    expect(motivoDeNoEliminar({ esSistema: false, personas: 2 }, true)).toBe(
      'Quítaselo a las personas que lo tienen antes de eliminarlo.',
    )
  })
})

describe('personasConElRol', () => {
  it('cuenta en singular, en plural y en cero', () => {
    expect(personasConElRol(0)).toBe('Nadie lo tiene')
    expect(personasConElRol(1)).toBe('1 persona')
    expect(personasConElRol(4)).toBe('4 personas')
  })
})
