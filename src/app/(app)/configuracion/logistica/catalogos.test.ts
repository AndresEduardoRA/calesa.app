import { describe, expect, it } from 'vitest'
import type { CatalogoDeLogistica } from '@/modules/logistica'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { catalogoDe, catalogosVisibles } from './catalogos'

const con = (clave: ClavePermiso, origenId: string | null = null): Permisos => [
  { clave, origenId, alcance: 'todos' },
]

const vacio = () => null
const lista: readonly CatalogoDeLogistica[] = [
  {
    clave: 'puertos',
    titulo: 'Puertos',
    permiso: 'logistica.catalogos.gestionar',
    componente: vacio,
  },
  {
    clave: 'gastos',
    titulo: 'Categorías de gasto',
    permiso: 'logistica.gastos.editar',
    componente: vacio,
  },
  {
    clave: 'puertos',
    titulo: 'Repetido',
    permiso: 'logistica.catalogos.gestionar',
    componente: vacio,
  },
]

describe('catálogos de Configuración › Logística', () => {
  it('hoy ningún área llena un catálogo: no hay pestañas ni con la clave de gestionar', () => {
    expect(catalogosVisibles(con('logistica.catalogos.gestionar'))).toEqual([])
  })

  it('cada catálogo lo ve quien tiene su permiso, en el orden de la lista', () => {
    expect(
      catalogosVisibles(con('logistica.catalogos.gestionar'), lista).map((c) => c.clave),
    ).toEqual(['puertos'])
    const ambas: Permisos = [
      ...con('logistica.catalogos.gestionar'),
      ...con('logistica.gastos.editar'),
    ]
    expect(catalogosVisibles(ambas, lista).map((c) => c.clave)).toEqual(['puertos', 'gastos'])
  })

  it('sin la clave, o con la de otro catálogo, no ve ninguno; la clave en un origen también vale', () => {
    expect(catalogosVisibles([], lista)).toEqual([])
    expect(catalogosVisibles(con('logistica.ver'), lista)).toEqual([])
    expect(catalogosVisibles(con('logistica.catalogos.gestionar', 'o1'), lista)).toHaveLength(1)
  })

  it('una clave repetida deja el primer catálogo', () => {
    const ambas: Permisos = [
      ...con('logistica.catalogos.gestionar'),
      ...con('logistica.gastos.editar'),
    ]
    expect(catalogosVisibles(ambas, lista).find((c) => c.clave === 'puertos')?.titulo).toBe(
      'Puertos',
    )
  })

  it('un valor ajeno de la URL abre el primero visible', () => {
    const [primero, segundo] = lista
    if (!primero || !segundo) throw new Error('lista de prueba')
    expect(catalogoDe('gastos', [primero, segundo]).clave).toBe('gastos')
    expect(catalogoDe('basura', [primero, segundo]).clave).toBe('puertos')
    expect(catalogoDe(undefined, [primero, segundo]).clave).toBe('puertos')
  })
})
