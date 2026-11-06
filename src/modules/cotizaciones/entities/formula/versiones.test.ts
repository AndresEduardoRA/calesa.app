import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  autoresDe,
  borradorAtrasado,
  conAutores,
  conVersionDeOrigen,
  cursorDeIrA,
  estadoDesde,
  MAXIMA_VERSION,
  nombreDelAutor,
  origenesParaConfigurar,
  paginaDeVersiones,
  versionDeOrigenPorLeer,
  versionesDesde,
  type VersionDeLaFormula,
} from './versiones'

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const fila = (version: number, estado: 'publicada' | 'archivada' = 'archivada') => ({
  id: ID(version),
  version,
  estado,
  nota: null,
  publicado_por: ID(900),
  publicado_en: '2026-11-06T10:00:00+00:00',
})

const version = (n: number): VersionDeLaFormula => ({
  id: ID(n),
  version: n,
  estado: 'archivada',
  nota: null,
  publicadoPor: ID(900),
  publicadoEn: '2026-11-06T10:00:00+00:00',
})

describe('versionesDesde', () => {
  it('lee las filas de la lista', () => {
    expect(versionesDesde([fila(2, 'publicada'), fila(1)])).toEqual([
      { ...version(2), estado: 'publicada' },
      version(1),
    ])
  })

  it('una fila con lo oculto (definicion, params, diseno, visibilidad) es un error, no una fila', () => {
    for (const columna of ['definicion', 'params', 'diseno', 'visibilidad']) {
      expect(versionesDesde([{ ...fila(1), [columna]: {} }])).toBeNull()
    }
  })

  it('un borrador (sin versión) no es una fila de la lista', () => {
    expect(versionesDesde([{ ...fila(1), version: null, estado: 'borrador' }])).toBeNull()
  })
})

describe('estadoDesde', () => {
  const publicada = {
    id: ID(3),
    version: 3,
    estado: 'publicada',
    nota: 'Flete nuevo',
    creado_por: ID(900),
    publicado_por: ID(901),
    publicado_en: '2026-11-06T10:00:00+00:00',
    actualizado_en: '2026-11-06T10:00:00+00:00',
    version_origen_id: ID(2),
  }
  const borrador = {
    ...publicada,
    id: ID(50),
    version: null,
    estado: 'borrador',
    nota: null,
    creado_por: ID(902),
    publicado_por: null,
    publicado_en: null,
    actualizado_en: '2026-11-06T11:00:00.123456+00:00',
    version_origen_id: ID(1),
  }

  it('separa la publicada y el borrador', () => {
    expect(estadoDesde([borrador, publicada])).toEqual({
      publicada: {
        id: ID(3),
        version: 3,
        nota: 'Flete nuevo',
        publicadoPor: ID(901),
        publicadoEn: '2026-11-06T10:00:00+00:00',
      },
      borrador: {
        id: ID(50),
        nota: null,
        creadoPor: ID(902),
        actualizadoEn: '2026-11-06T11:00:00.123456+00:00',
        versionOrigenId: ID(1),
        versionDeOrigen: null,
      },
    })
  })

  it('un borrador sobre la publicada toma su número sin leer nada más', () => {
    const estado = estadoDesde([publicada, { ...borrador, version_origen_id: ID(3) }])
    expect(estado?.borrador?.versionDeOrigen).toBe(3)
    expect(estado && versionDeOrigenPorLeer(estado)).toBeNull()
  })

  it('un borrador atrasado pide leer su versión de origen, y se le pone', () => {
    const estado = estadoDesde([publicada, borrador])
    if (!estado) {
      throw new Error('debía leerse')
    }
    expect(versionDeOrigenPorLeer(estado)).toBe(ID(1))
    expect(conVersionDeOrigen(estado, 1).borrador?.versionDeOrigen).toBe(1)
    expect(conVersionDeOrigen({ publicada: null, borrador: null }, 1).borrador).toBeNull()
  })

  it('sin filas, ninguna de las dos', () => {
    expect(estadoDesde([])).toEqual({ publicada: null, borrador: null })
  })

  it('un borrador sin versión de origen no pide leer nada', () => {
    const estado = estadoDesde([{ ...borrador, version_origen_id: null }])
    expect(estado && versionDeOrigenPorLeer(estado)).toBeNull()
  })

  it('una archivada, más de dos filas o lo oculto es un error', () => {
    expect(estadoDesde([{ ...publicada, estado: 'archivada' }])).toBeNull()
    expect(estadoDesde([publicada, borrador, borrador])).toBeNull()
    expect(estadoDesde([{ ...publicada, definicion: {} }])).toBeNull()
  })
})

describe('borradorAtrasado', () => {
  const publicada = { id: ID(3) }
  it('sin versión de origen, no', () => {
    expect(borradorAtrasado({ versionOrigenId: null }, publicada)).toBe(false)
  })
  it('sobre la publicada, no', () => {
    expect(borradorAtrasado({ versionOrigenId: ID(3) }, publicada)).toBe(false)
  })
  it('sobre otra, sí', () => {
    expect(borradorAtrasado({ versionOrigenId: ID(2) }, publicada)).toBe(true)
    expect(borradorAtrasado({ versionOrigenId: ID(2) }, null)).toBe(true)
  })
})

describe('paginaDeVersiones', () => {
  const filas = (n: number) => Array.from({ length: n }, (_, i) => version(100 - i))

  it('con una de más, hay otra página y sigue desde la última que se ve', () => {
    const pagina = paginaDeVersiones(filas(21), 20)
    expect(pagina.filas).toHaveLength(20)
    expect(pagina.siguiente).toBe(81)
  })

  it('sin la de más, no hay otra', () => {
    expect(paginaDeVersiones(filas(20), 20).siguiente).toBeNull()
    expect(paginaDeVersiones([], 20)).toEqual({ filas: [], siguiente: null })
  })
})

describe('autoresDe y nombreDelAutor', () => {
  it('los ids distintos y sin nulos', () => {
    expect(autoresDe([ID(1), null, ID(2), ID(1)])).toEqual([ID(1), ID(2)])
  })

  it('sin autor o sin nombre leído, «Alguien»', () => {
    const autores = new Map([[ID(1), 'Ana']])
    expect(nombreDelAutor(autores, ID(1))).toBe('Ana')
    expect(nombreDelAutor(autores, ID(2))).toBe('Alguien')
    expect(nombreDelAutor(autores, null)).toBe('Alguien')
  })

  it('conAutores pone el nombre en cada fila', () => {
    const pagina = conAutores({ filas: [version(1)], siguiente: null }, new Map([[ID(900), 'Ana']]))
    expect(pagina.filas[0]?.autor).toBe('Ana')
  })
})

describe('cursorDeIrA', () => {
  it('la versión pedida + 1', () => {
    expect(cursorDeIrA('12')).toEqual({ ok: true, data: 13 })
    expect(cursorDeIrA(' 1 ')).toEqual({ ok: true, data: 2 })
    expect(cursorDeIrA(String(MAXIMA_VERSION))).toEqual({ ok: true, data: MAXIMA_VERSION + 1 })
  })

  it('lo que no es un número de versión se rechaza', () => {
    for (const texto of ['0', '-1', '1,5', '1.5', 'abc', '', '2147483647', '99999999999']) {
      const resultado = cursorDeIrA(texto)
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) {
        expect(resultado.error.mensaje).toBe('Escribe un número de versión.')
      }
    }
  })
})

describe('origenesParaConfigurar', () => {
  const origenes = [
    { id: ID(1), activo: true },
    { id: ID(2), activo: false },
    { id: ID(3), activo: true },
  ]

  it('los de la clave, en su orden y también los inactivos', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: ID(2), alcance: 'todos' },
      { clave: 'cotizaciones.configurar', origenId: ID(3), alcance: 'propios' },
      { clave: 'cotizaciones.ver', origenId: ID(1), alcance: 'todos' },
    ]
    expect(origenesParaConfigurar(permisos, origenes).map((o) => o.id)).toEqual([ID(2), ID(3)])
  })

  it('la clave en todos los orígenes, todos', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: null, alcance: 'todos' },
    ]
    expect(origenesParaConfigurar(permisos, origenes)).toHaveLength(3)
  })
})
