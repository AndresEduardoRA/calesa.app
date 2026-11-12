import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { aplicarPreferencia, widgetsVisibles, WIDGETS_TABLERO } from './widgets'

const CON_PERMISO: Permisos = [{ clave: 'tablero.metricas.ver', origenId: null, alcance: 'todos' }]
const SIN_PERMISO: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }]

describe('widgetsVisibles', () => {
  it('con el permiso salen los cinco disponibles y ningún hueco', () => {
    const claves = widgetsVisibles(CON_PERMISO).map((w) => w.clave)
    expect(claves).toEqual([
      'leads-creados',
      'convertidos',
      'tasa-de-conversion',
      'cotizaciones-creadas',
      'cotizaciones-finales',
    ])
    expect(claves).not.toContain('margen-del-mes')
    expect(claves).not.toContain('cola-web')
  })

  it('sin el permiso no sale ninguno, y un permiso de otra clave no basta', () => {
    expect(widgetsVisibles([])).toEqual([])
    expect(widgetsVisibles(SIN_PERMISO)).toEqual([])
  })

  it('el catálogo no repite claves', () => {
    const claves = WIDGETS_TABLERO.map((w) => w.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })
})

describe('aplicarPreferencia', () => {
  const visibles = widgetsVisibles(CON_PERMISO)
  const claves = (lista: readonly { clave: string }[]) => lista.map((w) => w.clave)

  it('sin preferencia: todos mostrados, en el orden del catálogo', () => {
    const { mostrados, ocultos } = aplicarPreferencia(visibles, null)
    expect(claves(mostrados)).toEqual(claves(visibles))
    expect(ocultos).toEqual([])
  })

  it('respeta el orden y los ocultos', () => {
    const { mostrados, ocultos } = aplicarPreferencia(visibles, {
      orden: ['cotizaciones-finales', 'convertidos'],
      ocultos: ['leads-creados'],
    })
    expect(claves(mostrados)).toEqual([
      'cotizaciones-finales',
      'convertidos',
      'tasa-de-conversion',
      'cotizaciones-creadas',
    ])
    expect(claves(ocultos)).toEqual(['leads-creados'])
  })

  it('ignora una clave vieja y una que la persona no puede ver', () => {
    const { mostrados, ocultos } = aplicarPreferencia(visibles, {
      orden: ['clave-vieja', 'margen-del-mes', 'convertidos'],
      ocultos: ['clave-vieja', 'cola-web'],
    })
    expect(claves(mostrados)[0]).toBe('convertidos')
    expect(mostrados).toHaveLength(visibles.length)
    expect(ocultos).toEqual([])
  })

  it('un widget que la preferencia no nombra queda al final, en el orden del catálogo', () => {
    const { mostrados } = aplicarPreferencia(visibles, {
      orden: ['cotizaciones-creadas'],
      ocultos: [],
    })
    expect(claves(mostrados)).toEqual([
      'cotizaciones-creadas',
      'leads-creados',
      'convertidos',
      'tasa-de-conversion',
      'cotizaciones-finales',
    ])
  })

  it('un oculto lo es aunque no esté en el orden, y una clave repetida cuenta una vez', () => {
    const { mostrados, ocultos } = aplicarPreferencia(visibles, {
      orden: ['convertidos', 'convertidos'],
      ocultos: ['tasa-de-conversion', 'tasa-de-conversion'],
    })
    expect(claves(mostrados).filter((c) => c === 'convertidos')).toHaveLength(1)
    expect(claves(ocultos)).toEqual(['tasa-de-conversion'])
    expect(claves(mostrados)).not.toContain('tasa-de-conversion')
  })

  it('es idempotente', () => {
    const una = aplicarPreferencia(visibles, {
      orden: ['cotizaciones-finales', 'convertidos'],
      ocultos: ['leads-creados'],
    })
    const otra = aplicarPreferencia(visibles, {
      orden: claves([...una.mostrados, ...una.ocultos]),
      ocultos: claves(una.ocultos),
    })
    expect(claves(otra.mostrados)).toEqual(claves(una.mostrados))
    expect(claves(otra.ocultos)).toEqual(claves(una.ocultos))
  })
})
