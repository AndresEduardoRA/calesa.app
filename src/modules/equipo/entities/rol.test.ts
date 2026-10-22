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
  const fila = {
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
  }

  it('da forma a los roles con sus concesiones y su cuenta de personas (hasta el tope)', () => {
    expect(rolesDesde([fila], [{ rol_id: fila.id, personas: 3 }])).toEqual([
      {
        id: '00000000-0000-0000-0000-0000000000aa',
        clave: 'asesor',
        nombre: 'Asesor',
        color: '#027a48',
        esSistema: false,
        actualizadoEn: '2026-10-11T15:00:00.123456+00:00',
        concesiones: [{ clave: 'leads.ver', origenId: null, alcance: 'propios' }],
        personas: { n: 3, hayMas: false },
      },
    ])
  })

  // 5a-27: `roles_personas()` cuenta hasta 1.001 por rol; más que el tope es «más de 1.000», nunca el total.
  it('con 1.001 personas leídas el rol tiene «más de» el tope', () => {
    const [rol] = rolesDesde([fila], [{ rol_id: fila.id, personas: 1001 }])
    expect(rol?.personas).toEqual({ n: 1000, hayMas: true })
  })

  it('un rol que no vino en la cuenta no tiene a nadie', () => {
    const [rol] = rolesDesde([fila], [])
    expect(rol?.personas).toEqual({ n: 0, hayMas: false })
  })

  it('rechaza una cuenta con otra forma', () => {
    expect(() => rolesDesde([fila], [{ rol_id: 'x', personas: 3 }])).toThrow()
    expect(() => rolesDesde([fila], [{ rol_id: fila.id, personas: '3' }])).toThrow()
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

const NADIE = { n: 0, hayMas: false }

describe('motivoDeNoEliminar', () => {
  it('un rol propio, que domino y sin personas, se puede eliminar', () => {
    expect(motivoDeNoEliminar({ esSistema: false, personas: NADIE }, true)).toBeNull()
  })

  it('dice por qué no: de sistema, no lo domino o alguien lo tiene', () => {
    expect(motivoDeNoEliminar({ esSistema: true, personas: NADIE }, true)).toBe(
      'Un rol de sistema no se elimina.',
    )
    expect(motivoDeNoEliminar({ esSistema: false, personas: NADIE }, false)).toContain(
      'permisos que tú no tienes',
    )
    for (const personas of [
      { n: 2, hayMas: false },
      { n: 1000, hayMas: true },
    ]) {
      expect(motivoDeNoEliminar({ esSistema: false, personas }, true)).toBe(
        'Quítaselo a las personas que lo tienen antes de eliminarlo.',
      )
    }
  })
})

describe('personasConElRol', () => {
  it('cuenta en singular, en plural y en cero', () => {
    expect(personasConElRol({ n: 0, hayMas: false })).toBe('Nadie lo tiene')
    expect(personasConElRol({ n: 1, hayMas: false })).toBe('1 persona')
    expect(personasConElRol({ n: 37, hayMas: false })).toBe('37 personas')
  })

  it('pasado el tope dice «más de», nunca el total (5a-27)', () => {
    expect(personasConElRol({ n: 1000, hayMas: true })).toBe('más de 1.000 personas')
  })
})
