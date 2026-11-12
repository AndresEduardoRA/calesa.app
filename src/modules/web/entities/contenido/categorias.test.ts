import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DE_CATEGORIA_CON_GUIAS,
  motivoDeNoEliminar,
  ordenDeCategorias,
  slugDeCategoria,
  usoDeCategoria,
} from './categorias'

const sinOrden = (...ids: string[]) => ids.map((id) => ({ id, orden: 0 }))

describe('ordenDeCategorias', () => {
  it('con todas en orden 0, subir la tercera la deja segunda y reescribe 0..n−1 sólo en lo que cambia', () => {
    expect(ordenDeCategorias(sinOrden('a', 'b', 'c'), 'c', 'subir')).toEqual([
      { id: 'b', orden: 2 },
      { id: 'c', orden: 1 },
    ])
  })
  it('bajar la primera con orden ya escrito sólo cambia a las dos que se cruzan', () => {
    const lista = [
      { id: 'a', orden: 0 },
      { id: 'b', orden: 1 },
      { id: 'c', orden: 2 },
    ]
    expect(ordenDeCategorias(lista, 'a', 'bajar')).toEqual([
      { id: 'a', orden: 1 },
      { id: 'b', orden: 0 },
    ])
  })
  it('en el extremo o con un id que no está no cambia nada', () => {
    expect(ordenDeCategorias(sinOrden('a', 'b'), 'a', 'subir')).toEqual([])
    expect(ordenDeCategorias(sinOrden('a', 'b'), 'b', 'bajar')).toEqual([])
    expect(ordenDeCategorias(sinOrden('a', 'b'), 'x', 'subir')).toEqual([])
  })
})

describe('slugDeCategoria', () => {
  it('sale del nombre, sin tildes', () => {
    expect(slugDeCategoria('Cómo importar')).toBe('como-importar')
  })
  it('sólo símbolos no tiene dirección', () => {
    expect(slugDeCategoria('¿¡?!')).toBeNull()
  })
})

describe('uso y borrado', () => {
  it('dice con guías, sin guías o sin verificar', () => {
    expect(usoDeCategoria({ conGuias: true })).toBe('Con guías')
    expect(usoDeCategoria({ conGuias: false })).toBe('Sin guías')
    expect(usoDeCategoria({ conGuias: null })).toBe('Sin verificar')
  })
  it('sólo con guías se apaga «Eliminar»; sin verificar la action vuelve a revisar', () => {
    expect(motivoDeNoEliminar({ conGuias: true })).toBe(MOTIVO_DE_CATEGORIA_CON_GUIAS)
    expect(motivoDeNoEliminar({ conGuias: false })).toBeNull()
    expect(motivoDeNoEliminar({ conGuias: null })).toBeNull()
  })
})
