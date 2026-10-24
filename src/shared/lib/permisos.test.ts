// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  CLAVES_PERMISO,
  MODULOS_PERMISO,
  alcanceDe,
  compararNombresDeNivel,
  concesionesDe,
  esClaveDeNivel,
  esClavePermiso,
  esquemaClavePermiso,
  moduloDe,
  nivelDeClave,
  origenesCon,
  puede,
  type Permisos,
} from './permisos'

const USA = '11111111-1111-1111-1111-111111111111'
const COREA = '22222222-2222-2222-2222-222222222222'

const asesora: Permisos = [
  { clave: 'leads.ver', origenId: null, alcance: 'propios' },
  { clave: 'vehiculos.ver', origenId: USA, alcance: 'propios' },
  { clave: 'vehiculos.ver', origenId: COREA, alcance: 'todos' },
  { clave: 'flujos.mover', origenId: USA, alcance: 'todos' },
]

describe('catálogo', () => {
  it('coincide exactamente con las claves que siembra supabase/seed.sql', () => {
    const seed = readFileSync(path.join(process.cwd(), 'supabase/seed.sql'), 'utf8')
    const inicio = seed.indexOf('insert into public.permisos')
    const fin = seed.indexOf('on conflict (clave)', inicio)
    expect(inicio).toBeGreaterThan(-1)
    expect(fin).toBeGreaterThan(inicio)

    const delSeed = [
      ...seed.slice(inicio, fin).matchAll(/^\s*\('([a-z]+(?:\.[a-z_]+){1,3})'/gm),
    ].map((m) => m[1])
    expect(delSeed.length).toBeGreaterThan(0)
    expect([...CLAVES_PERMISO].sort()).toEqual([...delSeed].sort())
  })

  it('no repite claves', () => {
    expect(new Set(CLAVES_PERMISO).size).toBe(CLAVES_PERMISO.length)
  })

  it('reconoce una clave válida y rechaza una inventada', () => {
    expect(esClavePermiso('leads.ver')).toBe(true)
    expect(esClavePermiso('leads.volar')).toBe(false)
  })

  it('no lista a mano los permisos de un nivel: los reconoce por su patrón', () => {
    expect(CLAVES_PERMISO.filter((clave) => clave.startsWith('cotizaciones.nivel.'))).toEqual([])
    // «costos» lo siembra la migración de los niveles (no el seed): tiene que pasar el patrón.
    const migracion = readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20261019006100_niveles_de_acceso.sql'),
      'utf8',
    )
    expect(migracion).toContain("_nivel_permisos_crear('costos'")
    expect(esClavePermiso('cotizaciones.nivel.costos.ver')).toBe(true)
    expect(esClavePermiso('cotizaciones.nivel.costos.editar')).toBe(true)
    expect(moduloDe('cotizaciones.nivel.costos.ver')).toBe('cotizaciones')
  })
})

describe('permisos de un nivel de acceso (D7)', () => {
  it('reconoce la clave del nivel y distingue ver de editar', () => {
    expect(nivelDeClave('cotizaciones.nivel.gerencia.ver')).toBe('gerencia')
    expect(nivelDeClave('cotizaciones.nivel.n_2024.editar')).toBe('n_2024')
    expect(esClaveDeNivel('cotizaciones.nivel.gerencia.editar')).toBe(true)
  })

  it.each([
    ['«todos» no genera permisos', 'cotizaciones.nivel.todos.ver'],
    ['un sufijo que no es ver ni editar', 'cotizaciones.nivel.costos.borrar'],
    ['un nivel sin nombre', 'cotizaciones.nivel..ver'],
    ['sin el nivel', 'cotizaciones.nivel.costos'],
    ['mayúsculas', 'cotizaciones.nivel.Costos.ver'],
    ['empieza con un dígito', 'cotizaciones.nivel.9costos.ver'],
    ['empieza con guion bajo', 'cotizaciones.nivel._costos.ver'],
    ['una sola letra', 'cotizaciones.nivel.a.ver'],
    ['31 caracteres', `cotizaciones.nivel.${'a'.repeat(31)}.ver`],
    ['un segmento de más', 'cotizaciones.nivel.costos.extra.ver'],
    ['con punto en la clave', 'cotizaciones.nivel.cos.tos.ver'],
    ['con tilde', 'cotizaciones.nivel.dirección.ver'],
    ['otro módulo', 'leads.nivel.costos.ver'],
    ['con un espacio al final', 'cotizaciones.nivel.costos.ver '],
  ])('rechaza %s', (_motivo, clave) => {
    expect(esClaveDeNivel(clave)).toBe(false)
    expect(esClavePermiso(clave)).toBe(false)
    expect(nivelDeClave(clave)).toBeNull()
    expect(esquemaClavePermiso.safeParse(clave).success).toBe(false)
  })

  it('el esquema acepta una clave del catálogo y una de nivel, y nada que no sea texto', () => {
    expect(esquemaClavePermiso.safeParse('leads.ver').success).toBe(true)
    expect(esquemaClavePermiso.safeParse('cotizaciones.nivel.gerencia.ver').success).toBe(true)
    expect(esquemaClavePermiso.safeParse(7).success).toBe(false)
    expect(esquemaClavePermiso.safeParse(undefined).success).toBe(false)
  })

  it('una concesión de nivel llega a la sesión y una inventada se sigue descartando', () => {
    const filas = [
      { clave: 'cotizaciones.nivel.gerencia.ver', origen_id: USA, alcance: 'todos' },
      { clave: 'cotizaciones.nivel.todos.ver', origen_id: USA, alcance: 'todos' },
      { clave: 'cotizaciones.nivel.gerencia.borrar', origen_id: USA, alcance: 'todos' },
    ]
    const permisos = concesionesDe(filas)
    expect(permisos).toEqual([
      { clave: 'cotizaciones.nivel.gerencia.ver', origenId: USA, alcance: 'todos' },
    ])
    expect(puede(permisos, 'cotizaciones.nivel.gerencia.ver', USA)).toBe(true)
    expect(puede(permisos, 'cotizaciones.nivel.gerencia.ver', COREA)).toBe(false)
    expect(puede(permisos, 'cotizaciones.nivel.gerencia.editar', USA)).toBe(false)
  })

  it('ordena los nombres con el español, no con la colación de la base', () => {
    const nombres = ['Ñandú', 'zeta', 'Álamo', 'alfa', 'Costos']
    expect([...nombres].sort(compararNombresDeNivel)).toEqual([
      'Álamo',
      'alfa',
      'Costos',
      'Ñandú',
      'zeta',
    ])
  })
})

// Lo que la base exige de una clave de nivel, leído de sus archivos (no copiado): el check de la tabla y la regla de la clave de un permiso.
const leerSql = (ruta: string) => readFileSync(path.join(process.cwd(), ruta), 'utf8')
function reglaDe(archivo: string, desde: string, patron: RegExp): RegExp {
  const sql = leerSql(archivo)
  const texto = patron.exec(sql.slice(sql.indexOf(desde)))?.[1]
  return new RegExp(texto ?? '(no se leyó)')
}
const MIGRACION_DE_NIVELES = 'supabase/migrations/20261019006100_niveles_de_acceso.sql'
const checkDeLaTabla = reglaDe(
  'supabase/schemas/07_cotizaciones/01_cotizaciones.sql',
  'create table public.cotizaciones_niveles',
  /clave\s+text not null unique check \(clave ~ '([^']+)'\)/,
)
const reglaDeUnPermiso = reglaDe(
  'supabase/schemas/02_equipo/01_equipo.sql',
  'create table public.permisos',
  /clave\s+text primary key check \(clave ~ '([^']+)'\)/,
)

const NOMBRES_DIFICILES = [
  'Gerencia',
  'Costos',
  'Ñandú Ción 2',
  '2024 Costos',
  '  Dirección   general  ',
  'ÁÉÍÓÚ üñ',
  'a-b',
  'Muy largo '.repeat(4).trim(),
  'x'.repeat(40),
  'Compras & Ventas (internas)',
  '___guiones___',
  '99',
  'ab',
]

// La base es la fuente de las claves de nivel: la misma función SQL (`_nivel_clave()`), los mismos nombres difíciles, y todo lo que
// devuelve tiene que pasar lo mismo que la base le exige y el patrón de TS.
describe('contra _nivel_clave() de la base', () => {
  let db: PGlite

  beforeAll(async () => {
    const migracion = leerSql(MIGRACION_DE_NIVELES)
    const inicio = migracion.indexOf('create or replace function public._nivel_clave')
    const fin = migracion.indexOf('$$;', migracion.indexOf('begin', inicio)) + 3
    expect(inicio).toBeGreaterThan(-1)
    db = new PGlite()
    await db.exec(migracion.slice(inicio, fin))
  })

  afterAll(async () => {
    await db.close()
  })

  async function claveEnLaBase(nombre: string): Promise<string | null> {
    try {
      const { rows } = await db.query<{ c: string }>('select public._nivel_clave($1) as c', [
        nombre,
      ])
      return rows[0]?.c ?? null
    } catch {
      return null
    }
  }

  it('lee las dos reglas de la base', () => {
    expect(checkDeLaTabla.source).not.toContain('no se leyó')
    expect(reglaDeUnPermiso.source).not.toContain('no se leyó')
  })

  it.each(NOMBRES_DIFICILES)(
    'la clave de «%s» pasa lo que la base exige y el patrón de TS',
    async (nombre) => {
      const clave = await claveEnLaBase(nombre)
      if (clave === null) {
        // Un nombre sin al menos dos letras o números no da clave: la base lo rechaza, nada que reconocer.
        expect(nombre.replace(/[^a-zA-Z0-9]/g, '').length).toBeLessThan(2)
        return
      }
      expect(checkDeLaTabla.test(clave)).toBe(true)
      for (const sufijo of ['ver', 'editar']) {
        const permiso = `cotizaciones.nivel.${clave}.${sufijo}`
        expect(reglaDeUnPermiso.test(permiso)).toBe(true)
        expect(esClaveDeNivel(permiso)).toBe(true)
        expect(esClavePermiso(permiso)).toBe(true)
        expect(nivelDeClave(permiso)).toBe(clave)
      }
    },
  )
})

describe('el patrón de TS es el check de la tabla', () => {
  it('ninguna clave que la base admite se pierde (menos «todos», que no genera permisos)', () => {
    const candidatas = ['ab', 'a_', 'a_b', 'costos', 'n_2024', 'a'.repeat(30), 'a1', 'z9_']
    for (const clave of candidatas) {
      expect(checkDeLaTabla.test(clave)).toBe(true)
      expect(esClaveDeNivel(`cotizaciones.nivel.${clave}.ver`)).toBe(true)
    }
    for (const clave of ['a', '9a', '_a', 'A', 'a'.repeat(31), 'a.b', 'ñu']) {
      expect(checkDeLaTabla.test(clave)).toBe(false)
      expect(esClaveDeNivel(`cotizaciones.nivel.${clave}.ver`)).toBe(false)
    }
  })
})

describe('concesionesDe', () => {
  it('convierte las filas de mis_permisos() a concesiones', () => {
    const filas = [
      { clave: 'leads.ver', origen_id: null, alcance: 'propios' },
      { clave: 'flujos.mover', origen_id: USA, alcance: 'todos' },
    ]
    expect(concesionesDe(filas)).toEqual([
      { clave: 'leads.ver', origenId: null, alcance: 'propios' },
      { clave: 'flujos.mover', origenId: USA, alcance: 'todos' },
    ])
  })

  it('descarta una clave que el catálogo no conoce', () => {
    const filas = [{ clave: 'leads.volar', origen_id: null, alcance: 'todos' }]
    expect(concesionesDe(filas)).toEqual([])
  })

  it('rechaza una respuesta con otra forma', () => {
    expect(() => concesionesDe([{ clave: 'leads.ver', alcance: 'algunos' }])).toThrow()
    expect(() => concesionesDe(null)).toThrow()
  })
})

describe('puede', () => {
  it('sin permisos no puede nada', () => {
    expect(puede([], 'leads.ver')).toBe(false)
  })

  it('una concesión sin origen vale para cualquier origen', () => {
    expect(puede(asesora, 'leads.ver')).toBe(true)
    expect(puede(asesora, 'leads.ver', USA)).toBe(true)
  })

  it('una concesión acotada sólo vale en su origen', () => {
    expect(puede(asesora, 'flujos.mover', USA)).toBe(true)
    expect(puede(asesora, 'flujos.mover', COREA)).toBe(false)
  })

  it('sin origen pedido alcanza con tenerlo en alguno (para armar menús)', () => {
    expect(puede(asesora, 'flujos.mover')).toBe(true)
    expect(puede(asesora, 'flujos.mover', null)).toBe(true)
  })

  it('no confunde una clave con otra', () => {
    expect(puede(asesora, 'leads.editar')).toBe(false)
  })
})

describe('alcanceDe', () => {
  it('es null si no tiene el permiso', () => {
    expect(alcanceDe(asesora, 'leads.editar')).toBeNull()
    expect(alcanceDe(asesora, 'flujos.mover', COREA)).toBeNull()
  })

  it('devuelve el alcance de la concesión que cubre el origen', () => {
    expect(alcanceDe(asesora, 'vehiculos.ver', USA)).toBe('propios')
    expect(alcanceDe(asesora, 'vehiculos.ver', COREA)).toBe('todos')
  })

  it('gana «todos» cuando varias concesiones aplican', () => {
    expect(alcanceDe(asesora, 'vehiculos.ver')).toBe('todos')
    const dosRoles: Permisos = [
      { clave: 'leads.ver', origenId: null, alcance: 'propios' },
      { clave: 'leads.ver', origenId: null, alcance: 'todos' },
    ]
    expect(alcanceDe(dosRoles, 'leads.ver')).toBe('todos')
  })
})

describe('origenesCon', () => {
  it('es «todos» si alguna concesión no está acotada', () => {
    expect(origenesCon(asesora, 'leads.ver')).toBe('todos')
  })

  it('lista los orígenes sin repetir', () => {
    const repetida: Permisos = [
      ...asesora,
      { clave: 'vehiculos.ver', origenId: USA, alcance: 'todos' },
    ]
    expect(origenesCon(repetida, 'vehiculos.ver')).toEqual([USA, COREA])
  })

  it('es vacío si no tiene el permiso', () => {
    expect(origenesCon(asesora, 'leads.editar')).toEqual([])
  })
})

describe('módulos', () => {
  it('cada permiso del catálogo cae en un módulo con título', () => {
    for (const clave of CLAVES_PERMISO) {
      expect(MODULOS_PERMISO[moduloDe(clave)]).toBeTruthy()
    }
  })

  it('no queda ningún título sin permisos', () => {
    const usados = new Set(CLAVES_PERMISO.map(moduloDe))
    expect(Object.keys(MODULOS_PERMISO).sort()).toEqual([...usados].sort())
  })

  it('el módulo es el primer tramo de la clave', () => {
    expect(moduloDe('equipo.roles.gestionar')).toBe('equipo')
    expect(moduloDe('logistica.pagos.confirmar')).toBe('logistica')
  })
})
