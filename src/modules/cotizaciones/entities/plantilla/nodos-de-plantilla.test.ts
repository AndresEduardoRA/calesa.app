import { describe, expect, it } from 'vitest'
import type { Plantilla } from './forma-de-plantilla'
import { revisarNodosDePlantilla, type ContextoDeNodos } from './nodos-de-plantilla'

// Dos grupos con un bucket cada uno, el total, lo aparte y un tipo de cambio por bucket; dos modos que cambian el de `ext`.
const contexto: ContextoDeNodos = {
  definicion: {
    nodos: [
      { id: 'tc_a' },
      { id: 'tc_b' },
      { id: 'tc_m' },
      { id: 'remate', grupo: 'compra' },
      { id: 'grua', grupo: 'flete' },
      { id: 'cif' },
      { id: 'garantia' },
      { id: 'total', salida: 'total' },
    ],
    buckets: { ext: 'tc_a', adu: 'tc_b' },
    grupos: [
      { id: 'compra', bucket: 'ext' },
      { id: 'flete', bucket: 'adu' },
    ],
  },
  diseno: {
    cabecera: {
      modos: [
        { buckets: [{ bucket: 'ext', nodo: 'tc_a' }] },
        { buckets: [{ bucket: 'ext', nodo: 'tc_m' }] },
      ],
    },
    tarjeta_total: { secundarios: ['garantia'] },
  },
  visibilidad: Object.fromEntries(
    ['tc_a', 'tc_b', 'tc_m', 'remate', 'grua', 'garantia', 'total'].map((id) => [
      id,
      { ver: 'todos' },
    ]),
  ),
}
const plantilla: Plantilla = {
  grupos: [{ grupo: 'compra' }, { grupo: 'flete' }],
  total: { etiqueta: 'Total' },
  logo: false,
  columnas: { leyenda: false, tipo_cambio: true, plazo: false },
}
const veredicto = (p: Plantilla, c: ContextoDeNodos = contexto) => {
  const r = revisarNodosDePlantilla(p, c)
  return r === null ? 'válida' : `${r.regla}@${r.donde}`
}
const conVer = (cambios: Record<string, unknown>) => ({
  ...contexto,
  visibilidad: { ...contexto.visibilidad, ...cambios },
})

describe('revisarNodosDePlantilla', () => {
  it('una plantilla que nombra los miembros, el total y lo aparte, del nivel «todos», vale', () => {
    expect(veredicto({ ...plantilla, etiquetas: { remate: 'R', total: 'T', garantia: 'G' } })).toBe(
      'válida',
    )
  })

  it('primero lo inexistente, después lo sin lugar, cada uno por las etiquetas y luego las leyendas en orden C', () => {
    expect(veredicto({ ...plantilla, etiquetas: { cif: 'C' }, leyendas: { aa: '' } })).toBe(
      'nodo_inexistente@aa',
    )
    expect(veredicto({ ...plantilla, etiquetas: { zz: 'Z', yy: 'Y' } })).toBe('nodo_inexistente@yy')
    expect(veredicto({ ...plantilla, etiquetas: { cif: 'C' }, leyendas: { tc_a: '' } })).toBe(
      'nodo_sin_lugar@cif',
    )
  })

  it('una clave como `constructor` no es un nodo', () => {
    expect(veredicto({ ...plantilla, etiquetas: { constructor: 'x' } })).toBe(
      'nodo_inexistente@constructor',
    )
  })

  it('lo restringido: los miembros en el orden de la fórmula, el total y lo aparte', () => {
    expect(
      veredicto(plantilla, conVer({ grua: { ver: 'costos' }, remate: { ver: 'costos' } })),
    ).toBe('nodo_restringido@remate')
    expect(
      veredicto(plantilla, conVer({ garantia: { ver: 'costos' }, total: { ver: 'costos' } })),
    ).toBe('nodo_restringido@total')
    expect(veredicto(plantilla, conVer({ garantia: { ver: 'costos' } }))).toBe(
      'nodo_restringido@garantia',
    )
  })

  it('no figurar, no ser objeto o `ver` que no es el texto «todos» cuenta como restringido', () => {
    const sinRemate = Object.fromEntries(
      Object.entries(contexto.visibilidad ?? {}).filter(([id]) => id !== 'remate'),
    )
    expect(veredicto(plantilla, { ...contexto, visibilidad: sinRemate })).toBe(
      'nodo_restringido@remate',
    )
    expect(veredicto(plantilla, conVer({ remate: 'todos' }))).toBe('nodo_restringido@remate')
    expect(veredicto(plantilla, conVer({ remate: { ver: true } }))).toBe('nodo_restringido@remate')
    expect(veredicto(plantilla, conVer({ remate: ['todos'] }))).toBe('nodo_restringido@remate')
  })

  it('sin visibilidad todo es restringido; sin diseño no hay lo aparte', () => {
    expect(veredicto(plantilla, { ...contexto, visibilidad: null })).toBe('nodo_restringido@remate')
    expect(
      veredicto({ ...plantilla, etiquetas: { garantia: 'G' } }, { ...contexto, diseno: null }),
    ).toBe('nodo_sin_lugar@garantia')
  })

  it('sin total en la fórmula, el total no es lugar', () => {
    const sinTotal = {
      ...contexto.definicion,
      nodos: (contexto.definicion.nodos ?? []).filter((n) => n.id !== 'total'),
    }
    expect(
      veredicto({ ...plantilla, etiquetas: { total: 'T' } }, { ...contexto, definicion: sinTotal }),
    ).toBe('nodo_inexistente@total')
  })
})

describe('revisarNodosDePlantilla, el tipo de cambio', () => {
  it('el tipo de cambio: los buckets por omisión, en orden C del bucket, antes que los modos', () => {
    // `adu` va antes que `ext`, aunque su grupo vaya después.
    expect(veredicto(plantilla, conVer({ tc_a: { ver: 'costos' }, tc_b: { ver: 'costos' } }))).toBe(
      'tipo_de_cambio_restringido@tc_b',
    )
    expect(veredicto(plantilla, conVer({ tc_m: { ver: 'costos' }, tc_a: { ver: 'costos' } }))).toBe(
      'tipo_de_cambio_restringido@tc_a',
    )
  })

  it('el tipo de cambio de un modo: el primero en orden de modo y de bucket', () => {
    expect(veredicto(plantilla, conVer({ tc_m: { ver: 'costos' } }))).toBe(
      'tipo_de_cambio_restringido@tc_m',
    )
  })

  it('sin la columna del tipo de cambio no se mira', () => {
    const sinColumna = { ...plantilla, columnas: { ...plantilla.columnas, tipo_cambio: false } }
    expect(veredicto(sinColumna, conVer({ tc_a: { ver: 'costos' } }))).toBe('válida')
  })

  it('un bucket sin tipo de cambio no es candidato, aunque se llame `constructor`', () => {
    const definicion = {
      ...contexto.definicion,
      grupos: [
        { id: 'compra', bucket: 'constructor' },
        { id: 'flete', bucket: 'adu' },
      ],
    }
    const sinModos = {
      ...contexto,
      definicion,
      diseno: { ...contexto.diseno, cabecera: { modos: [] } },
    }
    expect(veredicto(plantilla, sinModos)).toBe('válida')
  })

  it('un modo que nombra un bucket que no usa ningún grupo no cuenta', () => {
    const diseno = {
      ...contexto.diseno,
      cabecera: { modos: [{ buckets: [{ bucket: 'otro', nodo: 'cif' }] }] },
    }
    expect(veredicto(plantilla, { ...contexto, diseno })).toBe('válida')
  })
})
