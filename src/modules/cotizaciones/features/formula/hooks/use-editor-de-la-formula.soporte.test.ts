import { describe, expect, it } from 'vitest'
import type { Formula } from '../../../entities/formula'
import {
  NODOS_DE_BASE,
  conElAjuste,
  formulaCruda,
  formulaDePrueba,
  sinTextoEn,
} from '../../../entities/formula/fila-de-prueba.soporte'
import type { Nodo } from '../../../entities/nodos'
import {
  editable,
  filaDelRechazo,
  filasParaDibujar,
  filasVisibles,
  paramsPlanos,
  type FilaParaDibujar,
} from './use-editor-de-la-formula.soporte'

const f = () =>
  formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'total', texto: '=(remate+fees)*4%', etiqueta: 'Total' },
  ])

const filaDe = (formula: Formula, id: string): FilaParaDibujar => {
  const fila = filasParaDibujar(formula).find((x) => x.id === id)
  if (!fila) throw new Error(`sin la fila ${id}`)
  return fila
}

const conNodo = (formula: Formula, id: string, cambio: Partial<Nodo>): Formula => ({
  ...formula,
  definicion: {
    ...formula.definicion,
    nodos: formula.definicion.nodos.map((n) => (n.id === id ? ({ ...n, ...cambio } as Nodo) : n)),
  },
})

describe('filasParaDibujar: el texto de cada fila (C4)', () => {
  it('las filas en su orden, sin las auxiliares de una fila con texto', () => {
    const filas = filasParaDibujar(f())
    expect(filas.map((x) => x.id)).toEqual([...NODOS_DE_BASE.map((n) => n.id), 'base', 'total'])
    expect(filaDe(f(), 'total').auxiliares).toEqual(['total__1', 'total__2'])
  })

  it('al día: su texto guardado', () => {
    expect(filaDe(f(), 'total').texto).toEqual({ modo: 'texto', texto: '=(remate+fees)*4%' })
  })

  it('el ⚙ que el texto puede escribir: reescrito, con el cambio', () => {
    expect(filaDe(conElAjuste(f(), 'total__2', 0.05), 'total').texto).toEqual({
      modo: 'reescrito',
      texto: '=(remate+fees)*5%',
      cambios: [{ id: 'total__2', enElTexto: 0.04, guardado: 0.05, formato: 'pct' }],
    })
  })

  it('el ⚙ que el texto no puede escribir (un negativo): no manda, con el texto guardado', () => {
    expect(filaDe(conElAjuste(f(), 'total__2', -0.03), 'total').texto).toEqual({
      modo: 'no_manda',
      texto: '=(remate+fees)*4%',
      motivo: 'valor_no_escribible',
      cambios: [{ id: 'total__2', enElTexto: 0.04, guardado: -0.03, formato: 'pct' }],
    })
  })

  it('un texto que ya no dice lo que la fila calcula: no manda por otra estructura', () => {
    const g = conNodo(f(), 'base', { de: ['remate', 'flete'] } as Partial<Nodo>)
    expect(filaDe(g, 'base').texto).toMatchObject({ modo: 'no_manda', motivo: 'otra_estructura' })
  })

  it('un texto que ya no compila: no manda por no compilar', () => {
    const g = conNodo(f(), 'base', { texto: '=remate+nada' } as Partial<Nodo>)
    expect(filaDe(g, 'base').texto).toMatchObject({ modo: 'no_manda', motivo: 'no_compila' })
  })

  it('sin texto: el que se escribe desde el nodo', () => {
    expect(filaDe(sinTextoEn(f(), 'base'), 'base').texto).toEqual({
      modo: 'texto',
      texto: 'remate+fees',
    })
  })

  it('sin texto y sin forma de escribirlo: por sus campos, y se puede editar', () => {
    // Un cálculo cuyo `de` nombra un nodo posterior y una constante negativa: `textoDeNodo()` da nulo.
    const g = formulaCruda(
      [
        ...NODOS_DE_BASE,
        { id: 'antes', tipo: 'calculo', op: 'suma', de: ['despues'], etiqueta: 'Antes' },
        { id: 'despues', tipo: 'constante', etiqueta: 'Después', formato: 'usd' },
      ],
      { despues: -3 },
    )
    const antes = filaDe(g, 'antes')
    expect(antes.texto).toEqual({ modo: 'campos' })
    expect(antes.nodo).toMatchObject({ op: 'suma', de: ['despues'] })
    expect(editable(antes)).toBe(true)
    const despues = filaDe(g, 'despues')
    expect(despues.texto).toEqual({ modo: 'campos' })
    expect(despues.valor).toBe(-3)
  })

  it('las demás filas: sólo lectura, sin «Editar»', () => {
    for (const id of ['remate', 'tc', 'b']) {
      const fila = filaDe(f(), id)
      expect(fila.texto).toEqual({ modo: 'solo_lectura' })
      expect(editable(fila)).toBe(false)
    }
  })
})

describe('filaDelRechazo: el rechazo de validarFormula() en su fila (C6)', () => {
  const filas = filasParaDibujar(f())
  it('`donde` de una fila: esa fila', () => {
    expect(filaDelRechazo({ regla: 'total_fijo', mensaje: 'x', donde: 'total' }, filas)).toBe(
      'total',
    )
  })
  it('`donde` de una auxiliar: su fila', () => {
    expect(
      filaDelRechazo({ regla: 'referencia_de_tipo', mensaje: 'x', donde: 'total__2' }, filas),
    ).toBe('total')
  })
  it('`campo` con un lugar de la lista: la fila que lo contiene (también una auxiliar)', () => {
    const total = filas.find((x) => x.id === 'total')
    if (!total) throw new Error('sin total')
    expect(
      filaDelRechazo(
        { regla: 'forma', mensaje: 'x', campo: `definicion.nodos.${String(total.desde)}.etiqueta` },
        filas,
      ),
    ).toBe('total')
  })
  it('un rechazo de la fórmula entera: ninguna', () => {
    expect(filaDelRechazo({ regla: 'total_unico', mensaje: 'x' }, filas)).toBeNull()
    expect(
      filaDelRechazo({ regla: 'forma', mensaje: 'x', campo: 'definicion.grupos.0' }, filas),
    ).toBeNull()
  })
})

describe('filasVisibles: «Buscar fila» y el tope (C8)', () => {
  const filas = filasParaDibujar(f())
  const ids = (v: { filas: FilaParaDibujar[] }) => v.filas.map((x) => x.id)

  it('sin búsqueda ni tope alcanzado: todas', () => {
    expect(filasVisibles(filas, '', null)).toMatchObject({ hayMas: false, sinCoincidencias: false })
    expect(ids(filasVisibles(filas, '', null))).toEqual(filas.map((x) => x.id))
  })

  it('busca por id y por etiqueta, sin distinguir mayúsculas', () => {
    expect(ids(filasVisibles(filas, 'TOT', null))).toEqual(['total'])
    expect(ids(filasVisibles(filas, 'tipo de', null))).toEqual(['tc'])
  })

  it('corta en el tope y dice que hay más', () => {
    const v = filasVisibles(filas, '', null, 3)
    expect(ids(v)).toEqual(filas.slice(0, 3).map((x) => x.id))
    expect(v.hayMas).toBe(true)
  })

  it('la abierta se dibuja aunque quede después del tope o el filtro no la nombre, en su lugar', () => {
    expect(ids(filasVisibles(filas, '', 'total', 2))).toEqual([filas[0]?.id, filas[1]?.id, 'total'])
    expect(ids(filasVisibles(filas, 'base', 'remate'))).toEqual(['remate', 'base'])
  })

  it('sin coincidencias: lista vacía (con la abierta, si hay)', () => {
    expect(filasVisibles(filas, 'no-existe', null)).toEqual({
      filas: [],
      hayMas: false,
      sinCoincidencias: true,
    })
    const conAbierta = filasVisibles(filas, 'no-existe', 'base')
    expect(ids(conAbierta)).toEqual(['base'])
    expect(conAbierta.sinCoincidencias).toBe(true)
  })
})

describe('paramsPlanos', () => {
  it('las constantes y las tablas en un solo objeto, como se guardan', () => {
    expect(paramsPlanos(f())).toEqual({ total__2: 0.04, tablas: {} })
  })
})
