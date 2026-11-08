import { describe, expect, it } from 'vitest'
import type { Plantilla } from './forma-de-plantilla'
import { filasDelEditor } from './filas-del-editor'
import { lecturaParaLaVistaPrevia } from './lectura-para-la-vista-previa'
import type { TonoDelCatalogo } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

const C = { fondo: '#aaaaaa', borde: '#bbbbbb', tinta: '#111111' }
const tonos: TonoDelCatalogo[] = [
  { clave: 'verde', nombre: 'Verde', claro: C, oscuro: C },
  { clave: 'azul', nombre: 'Azul', claro: C, oscuro: C },
]
const contexto: ContextoDePlantilla = {
  definicion: {
    nodos: [
      { id: 'fees', etiqueta: 'Fees', grupo: 'compra' },
      { id: 'grua', etiqueta: 'Grúa', grupo: 'logistica' },
      { id: 'remate', etiqueta: 'Remate', grupo: 'compra' },
      { id: 'tc', etiqueta: 'Oficial' },
      { id: 'total', etiqueta: 'TOTAL', salida: 'total' },
      { id: 'garantia', etiqueta: 'Garantía', salida: 'aparte' },
    ],
    buckets: { b1: 'tc' },
    grupos: [
      { id: 'compra', etiqueta: 'Compra', tono: 'verde', bucket: 'b1', plazo: '2 días' },
      { id: 'logistica', etiqueta: 'Logística', tono: 'fantasma', plazo: 7 },
    ],
  },
  diseno: { tarjeta_total: { secundarios: ['garantia'] } },
  visibilidad: null,
  tonos: ['verde', 'azul'],
}
const base: Plantilla = {
  grupos: [{ grupo: 'logistica' }, { grupo: 'compra', tono: 'azul' }],
  total: { etiqueta: 'Total final' },
  logo: true,
  columnas: { leyenda: true, plazo: true, tipo_cambio: true },
}
const leer = (p: Plantilla, c: ContextoDePlantilla = contexto) =>
  lecturaParaLaVistaPrevia({ plantilla: p, filas: filasDelEditor(p, c), contexto: c, tonos })

describe('lecturaParaLaVistaPrevia', () => {
  it('grupos en el orden de la plantilla, filas en el de la fórmula; plazo y tipo de cambio del bucket', () => {
    const l = leer(base)
    expect(l.grupos.map((g) => g.id)).toEqual(['logistica', 'compra'])
    expect(l.grupos[1]!.filas.map((f) => f.nodo)).toEqual(['fees', 'remate'])
    expect(l.grupos[1]).toMatchObject({ plazo: '2 días', tipoDeCambio: 'Oficial', filasDeMas: 0 })
    expect(l.grupos[0]).toMatchObject({ plazo: null, tipoDeCambio: null })
    expect(l.aparte).toEqual([{ nodo: 'garantia', etiqueta: 'Garantía' }])
  })

  it('la etiqueta escrita gana, en blanco cae a la del nodo; la leyenda es sólo la escrita y sólo con la columna', () => {
    const p: Plantilla = {
      ...base,
      etiquetas: { fees: 'Honorarios', remate: '   ' },
      leyendas: { fees: 'Incluye todo', remate: '' },
    }
    const filas = leer(p).grupos[1]!.filas
    expect(filas).toEqual([
      { nodo: 'fees', etiqueta: 'Honorarios', leyenda: 'Incluye todo' },
      { nodo: 'remate', etiqueta: 'Remate', leyenda: null },
    ])
    const sin = leer({ ...p, columnas: { ...p.columnas, leyenda: false } })
    expect(sin.grupos[1]!.filas.every((f) => f.leyenda === null)).toBe(true)
  })

  it('el tono elegido si está en el catálogo; si no el del grupo; si no ninguno', () => {
    const l = leer(base)
    // «logistica»: sin elegido, el del grupo es «fantasma» (no está en el catálogo): ninguno.
    expect(l.grupos.map((g) => g.tono)).toEqual([null, 'azul'])
    const fantasma = leer({ ...base, grupos: [{ grupo: 'compra', tono: 'rojo' }] })
    expect(fantasma.grupos[0]!.tono).toBe('verde')
    expect(l.tonos.map((t) => t.clave)).toEqual(['azul'])
  })

  it('total en blanco = «Total»; nota en blanco = ninguna; la leyenda del total sólo con la columna', () => {
    const l = leer({ ...base, total: { etiqueta: ' ', leyenda: 'Todo incluido' }, nota: '  ' })
    expect(l.total).toEqual({ etiqueta: 'Total', leyenda: 'Todo incluido' })
    expect(l.nota).toBeNull()
    expect(leer({ ...base, nota: 'Válida 5 días' }).nota).toBe('Válida 5 días')
    expect(
      leer({
        ...base,
        total: { etiqueta: 'T', leyenda: 'x' },
        columnas: { leyenda: false, plazo: false, tipo_cambio: false },
      }).total.leyenda,
    ).toBeNull()
  })
})

describe('lecturaParaLaVistaPrevia: el tope y los ids raros', () => {
  it('un grupo de 500 miembros da 4 filas y 496 de más, sin leerlos todos', () => {
    const miembros = Array.from({ length: 500 }, (_, i) => ({ id: `n${i}`, etiqueta: `N${i}` }))
    let lecturas = 0
    const espiado = new Proxy(miembros, {
      get(o, k, r) {
        if (typeof k === 'string' && /^\d+$/.test(k)) lecturas += 1
        return Reflect.get(o, k, r)
      },
    })
    const filas = {
      grupos: [
        {
          id: 'compra',
          etiqueta: 'Compra',
          tono: undefined,
          tonoDelGrupo: undefined,
          miembros: espiado,
        },
      ],
      total: null,
      aparte: [],
    }
    const l = lecturaParaLaVistaPrevia({ plantilla: base, filas, contexto, tonos })
    expect(l.grupos[0]!.filas).toHaveLength(4)
    expect(l.grupos[0]!.filasDeMas).toBe(496)
    expect(lecturas).toBeLessThanOrEqual(4)
  })

  it('los ids `constructor` y `__proto__` no rompen', () => {
    const c: ContextoDePlantilla = {
      ...contexto,
      definicion: {
        nodos: [
          { id: 'constructor', etiqueta: 'C', grupo: 'g' },
          { id: '__proto__', etiqueta: 'P', grupo: 'g' },
        ],
        grupos: [{ id: 'g', etiqueta: 'G', bucket: 'constructor' }],
        buckets: {},
      },
    }
    const p: Plantilla = {
      ...base,
      grupos: [{ grupo: 'g' }],
      etiquetas: JSON.parse('{"__proto__":"Uno"}'),
    }
    const g = leer(p, c).grupos[0]!
    expect(g.filas.map((f) => f.etiqueta)).toEqual(['C', 'Uno'])
    expect(g.tipoDeCambio).toBeNull()
  })
})
