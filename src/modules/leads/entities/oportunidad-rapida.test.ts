import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_DE_TITULO } from './oportunidad'
import {
  hayCambiosEnOportunidadRapida,
  pedidoDeOportunidadRapida,
  tituloSugeridoDeOportunidad,
  valoresDeOportunidadRapida,
} from './oportunidad-rapida'

describe('valoresDeOportunidadRapida', () => {
  it('sugiere el nombre del lead de título y sin monto', () => {
    expect(valoresDeOportunidadRapida('  Ana Pérez ')).toEqual({ titulo: 'Ana Pérez', monto: '' })
  })

  it('un nombre más largo que el máximo se corta para que el título valga', () => {
    const titulo = tituloSugeridoDeOportunidad('x'.repeat(LARGO_MAXIMO_DE_TITULO + 30))
    expect(titulo).toHaveLength(LARGO_MAXIMO_DE_TITULO)
    expect(pedidoDeOportunidadRapida({ titulo, monto: '' }, 'es-BO').tipo).toBe('crear')
  })
})

describe('hayCambiosEnOportunidadRapida', () => {
  const inicial = valoresDeOportunidadRapida('Ana')
  it('lo sugerido sin tocar no es un cambio', () => {
    expect(hayCambiosEnOportunidadRapida(inicial, inicial)).toBe(false)
  })
  it('un monto o otro título sí', () => {
    expect(hayCambiosEnOportunidadRapida({ ...inicial, monto: '500' }, inicial)).toBe(true)
    expect(hayCambiosEnOportunidadRapida({ ...inicial, titulo: 'Ana, Hilux' }, inicial)).toBe(true)
  })
  it('un monto de puros espacios no cuenta', () => {
    expect(hayCambiosEnOportunidadRapida({ ...inicial, monto: '  ' }, inicial)).toBe(false)
  })
})

describe('pedidoDeOportunidadRapida', () => {
  it('sin monto crea con el título y sin notas ni vehículo', () => {
    expect(pedidoDeOportunidadRapida({ titulo: ' Ana ', monto: '' }, 'es-BO')).toEqual({
      tipo: 'crear',
      datos: { titulo: 'Ana', monto_estimado: null, notas: null, vehiculo_id: null },
    })
  })

  it('lee el monto con el locale de la empresa', () => {
    const pedido = pedidoDeOportunidadRapida({ titulo: 'Ana', monto: '25.000,50' }, 'es-BO')
    expect(pedido).toMatchObject({ tipo: 'crear', datos: { monto_estimado: 25000.5 } })
  })

  it('un título vacío y un monto roto dicen su motivo por campo', () => {
    const pedido = pedidoDeOportunidadRapida({ titulo: '  ', monto: 'abc' }, 'es-BO')
    expect(pedido.tipo).toBe('invalido')
    if (pedido.tipo === 'invalido') {
      expect(Object.keys(pedido.errores).sort()).toEqual(['monto_estimado', 'titulo'])
    }
  })
})
