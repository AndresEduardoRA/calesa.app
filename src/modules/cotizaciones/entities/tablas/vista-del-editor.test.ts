import { describe, expect, it } from 'vitest'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import { moverFila, type FilaEditable } from './edicion'
import {
  aplicarTexto,
  devolverFila,
  FILAS_POR_PAGINA_DEL_EDITOR,
  hayCambios,
  paginaDe,
  paginas,
  primerError,
  quitarConCrudos,
  type EstadoDelEditor,
} from './vista-del-editor'

const COLUMNAS: ColumnaDeTabla[] = [
  { clave: 'anio', etiqueta: 'Año', tipo: 'anio' },
  { clave: 'factor', etiqueta: 'Factor', tipo: 'numero' },
]
const ANIO = COLUMNAS[0] as ColumnaDeTabla
const FACTOR = COLUMNAS[1] as ColumnaDeTabla

const filas = (n: number): FilaEditable[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `f${String(i)}`,
    valores: { anio: 2000 + i, factor: i },
  }))
const estado = (lista: FilaEditable[]): EstadoDelEditor => ({ filas: lista, crudos: {} })

describe('las páginas', () => {
  it('son de 100 filas, sin total', () => {
    expect(FILAS_POR_PAGINA_DEL_EDITOR).toBe(100)
    expect(paginas(0)).toEqual([{ indice: 0, etiqueta: 'Desde la fila 1' }])
    expect(paginas(201).map((p) => p.etiqueta)).toEqual([
      'Desde la fila 1',
      'Desde la fila 101',
      'Desde la fila 201',
    ])
    expect(paginas(2000).at(-1)?.etiqueta).toBe('Desde la fila 1.901')
  })

  it('una fila está en la página de su índice', () => {
    expect(paginaDe(0)).toBe(0)
    expect(paginaDe(99)).toBe(0)
    expect(paginaDe(100)).toBe(1)
  })
})

describe('aplicarTexto', () => {
  it('lo que se lee va a la fila; lo que no, queda crudo sin tocarla', () => {
    const inicio = estado(filas(2))
    const bien = aplicarTexto(inicio, { columna: FACTOR, filaId: 'f1' }, '9.200,5', 'es-BO')
    expect(bien.filas[1]?.valores['factor']).toBe(9200.5)
    expect(bien.crudos).toEqual({})
    const mal = aplicarTexto(bien, { columna: FACTOR, filaId: 'f1' }, '1.5', 'es-BO')
    expect(mal.filas[1]?.valores['factor']).toBe(9200.5)
    expect(mal.crudos).toEqual({
      f1: { factor: { texto: '1.5', mensaje: 'Usa coma para los decimales: 1,5.' } },
    })
    expect(aplicarTexto(mal, { columna: FACTOR, filaId: 'f1' }, '1,5', 'es-BO').crudos).toEqual({})
  })

  it('salir sin tocar no redondea un valor de más de 15 cifras', () => {
    const inicio = estado([{ id: 'a', valores: { factor: 0.30000000000000004 } }])
    const salido = aplicarTexto(inicio, { columna: FACTOR, filaId: 'a' }, '0,3', 'es-BO')
    expect(salido.filas[0]?.valores['factor']).toBe(0.30000000000000004)
    expect(hayCambios(inicio.filas, salido)).toBe(false)
  })
})

describe('primerError', () => {
  it('el crudo de la fila 3 va antes que la celda inválida de la fila 7', () => {
    const lista = filas(8).map((f, i) =>
      i === 6 ? { ...f, valores: { ...f.valores, factor: 'x' } } : f,
    )
    const conCrudo = aplicarTexto(estado(lista), { columna: ANIO, filaId: 'f2' }, '2018,5', 'es-BO')
    expect(primerError(COLUMNAS, conCrudo)).toEqual({
      mensaje: 'La fila 3: Escribe un año sin decimales, por ejemplo 2018.',
      filaId: 'f2',
      clave: 'anio',
      pagina: 0,
      conCelda: true,
    })
    expect(primerError(COLUMNAS, estado(lista))).toEqual({
      mensaje: 'La fila 7: «Factor» va con un número.',
      filaId: 'f6',
      clave: 'factor',
      pagina: 0,
      conCelda: true,
    })
  })

  it('con empate en la fila, el crudo', () => {
    const lista = filas(1).map((f) => ({ ...f, valores: { ...f.valores, factor: 'x' } }))
    const conCrudo = aplicarTexto(estado(lista), { columna: ANIO, filaId: 'f0' }, 'abc', 'es-BO')
    expect(primerError(COLUMNAS, conCrudo)?.clave).toBe('anio')
  })

  it('dice la página de una fila lejana y si hay campo donde ir', () => {
    const lista = filas(250)
    const lejos = lista.map((f, i) =>
      i === 240 ? { ...f, valores: { ...f.valores, otra: 1 } } : f,
    )
    expect(primerError(COLUMNAS, estado(lejos))).toEqual({
      mensaje: 'La fila 241: la tabla no tiene la columna «otra».',
      filaId: 'f240',
      clave: 'otra',
      pagina: 2,
      conCelda: false,
    })
  })

  it('nulo si todo vale', () => {
    expect(primerError(COLUMNAS, estado(filas(3)))).toBeNull()
  })
})

describe('hayCambios', () => {
  it('mover sin editar es un cambio', () => {
    const leidas = filas(3)
    expect(hayCambios(leidas, estado(moverFila(leidas, 'f2', 0)))).toBe(true)
  })

  it('editar y volver al valor leído no lo es, aunque la clave cambie de lugar', () => {
    const leidas = filas(2)
    const quitado = aplicarTexto(estado(leidas), { columna: ANIO, filaId: 'f0' }, '', 'es-BO')
    expect(hayCambios(leidas, quitado)).toBe(true)
    const vuelto = aplicarTexto(quitado, { columna: ANIO, filaId: 'f0' }, '2000', 'es-BO')
    expect(Object.keys(vuelto.filas[0]?.valores ?? {})).toEqual(['factor', 'anio'])
    expect(hayCambios(leidas, vuelto)).toBe(false)
  })

  it('un crudo es un cambio', () => {
    const leidas = filas(1)
    expect(
      hayCambios(
        leidas,
        aplicarTexto(estado(leidas), { columna: FACTOR, filaId: 'f0' }, 'abc', 'es-BO'),
      ),
    ).toBe(true)
  })
})

describe('quitar y devolver', () => {
  it('quitar se lleva los crudos de la fila y devolver los repone en su lugar', () => {
    const conCrudo = aplicarTexto(
      estado(filas(3)),
      { columna: FACTOR, filaId: 'f1' },
      'abc',
      'es-BO',
    )
    const { estado: sin, quitada } = quitarConCrudos(conCrudo, 'f1')
    expect(sin.filas.map((f) => f.id)).toEqual(['f0', 'f2'])
    expect(sin.crudos).toEqual({})
    expect(primerError(COLUMNAS, sin)).toBeNull()
    if (!quitada) throw new Error('la fila estaba')
    expect(devolverFila(sin, quitada)).toEqual(conCrudo)
  })

  it('una fila que no está no cambia nada', () => {
    const inicio = estado(filas(2))
    expect(quitarConCrudos(inicio, 'nada')).toEqual({ estado: inicio, quitada: null })
  })
})
