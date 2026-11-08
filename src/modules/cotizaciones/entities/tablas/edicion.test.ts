import { describe, expect, it } from 'vitest'
import {
  editarCelda,
  filasParaPublicar,
  moverFila,
  quitarFila,
  sumarFila,
  type FilaEditable,
  type ValoresDeFila,
} from './edicion'
import { MENSAJE_DEL_TOPE, TOPE_DE_FILAS } from './validacion'

const fila = (id: string, valores: ValoresDeFila = { n: id }): FilaEditable =>
  Object.freeze({ id, valores: Object.freeze(valores) })
const lista = (...ids: string[]) => Object.freeze(ids.map((id) => fila(id)))
const ids = (filas: readonly FilaEditable[]) => filas.map((f) => f.id)

describe('sumarFila', () => {
  it('inserta una fila vacía en el medio y en los extremos (acotado)', () => {
    const filas = lista('a', 'b')
    const medio = sumarFila(filas, 1, 'x')
    expect(medio.ok && ids(medio.data)).toEqual(['a', 'x', 'b'])
    expect(medio.ok && medio.data[1]?.valores).toEqual({})
    const inicio = sumarFila(filas, -5, 'x')
    expect(inicio.ok && ids(inicio.data)).toEqual(['x', 'a', 'b'])
    const fin = sumarFila(filas, 99, 'x')
    expect(fin.ok && ids(fin.data)).toEqual(['a', 'b', 'x'])
  })

  it('con 2.000 filas da el tope', () => {
    const llena = Array.from({ length: TOPE_DE_FILAS }, (_, n) => fila(String(n)))
    expect(sumarFila(llena, 0, 'x')).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: MENSAJE_DEL_TOPE },
    })
  })
})

describe('quitarFila y moverFila', () => {
  it('quitarFila saca la del id', () => {
    expect(ids(quitarFila(lista('a', 'b', 'c'), 'b'))).toEqual(['a', 'c'])
    expect(ids(quitarFila(lista('a'), 'z'))).toEqual(['a'])
  })

  it('moverFila arriba, abajo, fuera de rango y con un id que no está', () => {
    const filas = lista('a', 'b', 'c', 'd')
    expect(ids(moverFila(filas, 'c', 0))).toEqual(['c', 'a', 'b', 'd'])
    expect(ids(moverFila(filas, 'a', 2))).toEqual(['b', 'c', 'a', 'd'])
    expect(ids(moverFila(filas, 'b', 99))).toEqual(['a', 'c', 'd', 'b'])
    expect(ids(moverFila(filas, 'b', -1))).toEqual(['b', 'a', 'c', 'd'])
    expect(ids(moverFila(filas, 'z', 0))).toEqual(['a', 'b', 'c', 'd'])
    expect(ids(moverFila(filas, 'b', 1))).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('editarCelda', () => {
  it('pisa el valor y con null quita la clave, como guarda la base', () => {
    const filas = Object.freeze([fila('a', { monto: 1, nombre: 'x' })])
    expect(editarCelda(filas, 'a', 'monto', 2)[0]?.valores).toEqual({ monto: 2, nombre: 'x' })
    expect(editarCelda(filas, 'a', 'nombre', null)[0]?.valores).toEqual({ monto: 1 })
    expect(editarCelda(filas, 'z', 'monto', 2)).toEqual(filas)
  })
})

describe('filasParaPublicar', () => {
  it('conserva el orden y quita los ids y las celdas nulas o ausentes', () => {
    const filas = Object.freeze([
      fila('b', { monto: 2, nota: null }),
      fila('a', { monto: 1, otra: undefined }),
    ])
    expect(filasParaPublicar(filas)).toEqual([{ monto: 2 }, { monto: 1 }])
  })
})

describe('ninguna operación cambia la lista que recibe', () => {
  it('con listas congeladas no lanza y la original queda igual', () => {
    const filas = lista('a', 'b')
    sumarFila(filas, 0, 'x')
    quitarFila(filas, 'a')
    moverFila(filas, 'a', 1)
    editarCelda(filas, 'a', 'n', 3)
    filasParaPublicar(filas)
    expect(filas).toEqual([fila('a'), fila('b')])
  })
})
