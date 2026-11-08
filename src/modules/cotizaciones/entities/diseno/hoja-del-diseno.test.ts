import { describe, expect, it } from 'vitest'
import { esquemaDefinicion } from '../formula'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { hojaDeLaVistaPrevia } from './hoja-del-diseno'

const ORIGEN = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Miami' }
const claro = { fondo: '#ffffff', borde: '#000000', tinta: '#111111' }
const tonos = [
  { clave: 'costos', claro, oscuro: claro },
  { clave: 'sobra', claro, oscuro: claro },
]
const conGrupo = esquemaDefinicion.parse({
  ...formulaDePrueba,
  nodos: formulaDePrueba.nodos.map((n) =>
    n.id === 'a' || n.id === 'b' ? { ...n, grupo: 'g1' } : n,
  ),
  buckets: { oficial: 'tc' },
  grupos: [{ id: 'g1', etiqueta: 'Grupo', tono: 'costos', bucket: 'oficial' }],
})

describe('hojaDeLaVistaPrevia', () => {
  const diseno = disenoDe([
    seccion('s', [
      { tipo: 'variante', nodo: 'variante' },
      celda('a', { ancho: 'mitad', ayuda: { texto: 'Una ayuda' } }),
      celda('comision', { secundario: 'porcentaje' }),
      { tipo: 'interruptor', nodo: 'libre', efecto: 'muestra' },
      { tipo: 'subtotal', nodo: 'neto' },
      celda('nodo_que_ya_no_existe'),
    ]),
    seccion('t', [celda('c')], { presentacion: 'avanzado', titulo: 'Aparte' }),
  ])

  it('T1 · trae los ítems, etiquetas y formatos de la fórmula y omite un nodo que no existe', () => {
    const hoja = hojaDeLaVistaPrevia(ORIGEN, diseno, formulaDePrueba, [])
    expect(hoja.estado).toBe('lista')
    expect(hoja.secciones.map((s) => [s.id, s.presentacion, s.titulo])).toStrictEqual([
      ['s', 'principal', null],
      ['t', 'avanzado', 'Aparte'],
    ])
    const items = hoja.secciones[0]?.items ?? []
    expect(items.map((i) => `${i.tipo}:${i.nodo}`)).toStrictEqual([
      'variante:variante',
      'celda:a',
      'celda:comision',
      'interruptor:libre',
      'subtotal:neto',
    ])
    const a = items[1]
    expect(a).toMatchObject({
      etiqueta: 'A',
      formato: 'usd',
      ancho: 'mitad',
      ayuda: { texto: 'Una ayuda' },
      editable: true,
      motivo: null,
      ajustes: false,
    })
    expect(items[0]).toMatchObject({ porDefecto: null, opciones: [{ clave: 'x' }, { clave: 'y' }] })
    expect(items[2]).toMatchObject({
      secundario: { nodo: 'tasa', como: 'porcentaje', formato: 'pct' },
    })
    expect(items[3]).toMatchObject({ efecto: 'muestra' })
    expect(items[4]).toMatchObject({ etiqueta: 'Neto', formato: 'usd' })
    expect(hoja.tarjetaTotal).toMatchObject({ nodo: 'total', etiqueta: 'Total', secundarios: [] })
  })

  it('T1 · toma el tono sólo si el catálogo lo tiene y sólo los que el diseño usa', () => {
    const d = disenoDe([seccion('s', [celda('a'), celda('c')])])
    const hoja = hojaDeLaVistaPrevia(ORIGEN, d, conGrupo, tonos)
    expect(hoja.tonos.map((t) => t.clave)).toStrictEqual(['costos'])
    expect(hoja.secciones[0]?.items[0]).toMatchObject({ tono: 'costos' })
    expect(hoja.secciones[0]?.items[1]).toMatchObject({ tono: null })
    // Sin ese tono en el catálogo, la celda sigue con su clave y la hoja no manda un tono que no existe.
    expect(hojaDeLaVistaPrevia(ORIGEN, d, conGrupo, []).tonos).toStrictEqual([])
  })
})
