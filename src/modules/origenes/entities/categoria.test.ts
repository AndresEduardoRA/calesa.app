import { describe, expect, it } from 'vitest'
import {
  arbolDeCategorias,
  categoriasDesde,
  destinoDeMoverCategoria,
  motivoParaNoEliminarCategoria,
} from './categoria'

const ORIGEN = '00000000-0000-0000-0000-0000000000aa'
const id = (n: number) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`

function fila(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: id(n),
    origen_id: ORIGEN,
    padre_id: null,
    nombre: `Categoría ${n}`,
    orden: n * 10,
    activa: true,
    actualizado_en: '2026-10-12T20:00:00+00:00',
    ...extra,
  }
}

describe('categoriasDesde', () => {
  it('ordena por orden y une los vehículos contados', () => {
    const categorias = categoriasDesde([fila(2), fila(1)], [{ categoria_id: id(1), vehiculos: 4 }])
    expect(categorias.map((c) => [c.nombre, c.vehiculos])).toEqual([
      ['Categoría 1', 4],
      ['Categoría 2', 0],
    ])
  })

  it('sin permiso para contar, no inventa ceros', () => {
    const [categoria] = categoriasDesde([fila(1)], null)
    expect(categoria?.vehiculos).toBeNull()
  })
})

describe('arbolDeCategorias', () => {
  it('cuelga cada hija de su padre', () => {
    const categorias = categoriasDesde(
      [fila(1), fila(2), fila(3, { padre_id: id(1) }), fila(4, { padre_id: id(1) })],
      null,
    )
    const arbol = arbolDeCategorias(categorias)
    expect(arbol.map((n) => n.categoria.id)).toEqual([id(1), id(2)])
    expect(arbol[0]?.hijas.map((h) => h.id)).toEqual([id(3), id(4)])
    expect(arbol[1]?.hijas).toEqual([])
  })

  it('una hija huérfana se muestra como raíz', () => {
    const arbol = arbolDeCategorias(categoriasDesde([fila(1, { padre_id: id(9) })], null))
    expect(arbol).toHaveLength(1)
  })
})

describe('destinoDeMoverCategoria', () => {
  const hermanas = categoriasDesde([fila(1), fila(2), fila(3)], null)

  it('subir la segunda la deja primera', () => {
    expect(destinoDeMoverCategoria(hermanas, id(2), 'subir')).toEqual({ despuesDe: null })
  })

  it('subir la tercera la deja después de la primera', () => {
    expect(destinoDeMoverCategoria(hermanas, id(3), 'subir')).toEqual({ despuesDe: id(1) })
  })

  it('bajar la primera la deja después de la segunda', () => {
    expect(destinoDeMoverCategoria(hermanas, id(1), 'bajar')).toEqual({ despuesDe: id(2) })
  })

  it('en los extremos no hay a dónde ir', () => {
    expect(destinoDeMoverCategoria(hermanas, id(1), 'subir')).toBeNull()
    expect(destinoDeMoverCategoria(hermanas, id(3), 'bajar')).toBeNull()
    expect(destinoDeMoverCategoria(hermanas, id(9), 'bajar')).toBeNull()
  })
})

describe('motivoParaNoEliminarCategoria', () => {
  const [categoria, hija] = categoriasDesde(
    [fila(1), fila(2, { padre_id: id(1) })],
    [
      { categoria_id: id(1), vehiculos: 0 },
      { categoria_id: id(2), vehiculos: 2 },
    ],
  )
  if (!categoria || !hija) {
    throw new Error('sin categorías')
  }

  it('una con subcategorías no se elimina', () => {
    expect(motivoParaNoEliminarCategoria(categoria, [hija])).toContain('subcategorías')
  })

  it('una con vehículos manda a desactivar', () => {
    expect(motivoParaNoEliminarCategoria(hija, [])).toContain('2 vehículos están')
  })

  it('una vacía se elimina', () => {
    expect(motivoParaNoEliminarCategoria(categoria, [])).toBeNull()
  })
})
