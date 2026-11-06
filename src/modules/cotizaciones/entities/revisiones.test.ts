import { describe, expect, it } from 'vitest'
import { autorDeLaRevision, hastaDeUnDia, revisionesDesde } from './revisiones'

const USUARIO = '00000000-0000-4000-8000-0000000000aa'
const fila = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  usuario_id: USUARIO,
  creado_en: '2026-11-04T10:00:00.123456+00:00',
  autor: { id: USUARIO, nombre: 'Ana Pérez' },
  diff: { valores: { de: { pub: 1 }, a: { pub: 2 } } },
  ...extra,
})
const respuesta = (revisiones: unknown[], extra: Record<string, unknown> = {}) => ({
  revisiones,
  hay_mas: false,
  siguiente: null,
  etiquetas: { nodos: { pub: 'Precio' }, grupos: { g1: 'Grupo' } },
  ...extra,
})

describe('revisionesDesde: la página de revisiones de la base', () => {
  it('lee las filas en el orden en que llegaron, con el autor y las etiquetas', () => {
    const r = revisionesDesde(respuesta([fila(9), fila(7)]))
    expect(r?.revisiones.map((x) => x.id)).toEqual([9, 7])
    expect(r?.revisiones[0]).toMatchObject({
      usuarioId: USUARIO,
      creadoEn: '2026-11-04T10:00:00.123456+00:00',
      autor: 'Ana Pérez',
    })
    expect(r?.etiquetas.nodos.get('pub')).toBe('Precio')
    expect(r?.etiquetas.grupos.get('g1')).toBe('Grupo')
    expect(r?.siguiente).toBeNull()
  })

  it('el siguiente es el cursor sólo cuando hay más', () => {
    expect(revisionesDesde(respuesta([fila(9)], { hay_mas: true, siguiente: 9 }))?.siguiente).toBe(
      9,
    )
    expect(
      revisionesDesde(respuesta([fila(9)], { hay_mas: false, siguiente: 9 }))?.siguiente,
    ).toBeNull()
  })

  it('una fila sin id hace de la lectura un error, no una fila', () => {
    expect(revisionesDesde(respuesta([fila(9), { ...fila(8), id: undefined }]))).toBeNull()
    expect(revisionesDesde(null)).toBeNull()
    expect(revisionesDesde({})).toBeNull()
  })

  it('un id como «constructor» es una etiqueta más, no el de Object', () => {
    const r = revisionesDesde(
      respuesta([fila(1)], { etiquetas: { nodos: { constructor: 'Raro' }, grupos: {} } }),
    )
    expect(r?.etiquetas.nodos.get('constructor')).toBe('Raro')
    expect(r?.etiquetas.nodos.get('toString')).toBeUndefined()
  })
})

describe('autorDeLaRevision', () => {
  const leida = (extra: Record<string, unknown>) =>
    revisionesDesde(respuesta([fila(1, extra)]))?.revisiones[0]
  it('sin usuario: «Sin autor»; con el nombre vacío o nulo: «Sin nombre»; si no, el nombre', () => {
    const sin = leida({ usuario_id: null, autor: null })
    const vacio = leida({ autor: { id: USUARIO, nombre: null } })
    const con = leida({})
    expect(sin && autorDeLaRevision(sin)).toBe('Sin autor')
    expect(vacio && autorDeLaRevision(vacio)).toBe('Sin nombre')
    expect(con && autorDeLaRevision(con)).toBe('Ana Pérez')
  })
})

describe('hastaDeUnDia: el borde exclusivo de «ese día y lo anterior»', () => {
  it('es el inicio del día siguiente en la zona de la empresa', () => {
    expect(hastaDeUnDia('2026-10-13', 'America/La_Paz')).toBe('2026-10-14T04:00:00.000Z')
    expect(hastaDeUnDia('2026-10-13', 'Asia/Tokyo')).toBe('2026-10-13T15:00:00.000Z')
    expect(hastaDeUnDia('2026-12-31', 'America/La_Paz')).toBe('2027-01-01T04:00:00.000Z')
  })

  it('un texto que no es un día da nulo', () => {
    expect(hastaDeUnDia('', 'America/La_Paz')).toBeNull()
    expect(hastaDeUnDia('2026-13-01', 'America/La_Paz')).toBeNull()
    expect(hastaDeUnDia('13/10/2026', 'America/La_Paz')).toBeNull()
  })
})
