import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { aplicarPreferencia, widgetsVisibles, WIDGETS_TABLERO } from './widgets'

const CON_PERMISO: Permisos = [{ clave: 'tablero.metricas.ver', origenId: null, alcance: 'todos' }]
const SIN_PERMISO: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }]

describe('widgetsVisibles', () => {
  it('con sólo el permiso del tablero salen los diez, y ningún widget de dinero ni de la cola', () => {
    const claves = widgetsVisibles(CON_PERMISO).map((w) => w.clave)
    expect(claves).toEqual([
      'leads-creados',
      'convertidos',
      'tasa-de-conversion',
      'cotizaciones-creadas',
      'cotizaciones-finales',
      'leads-por-dia',
      'cotizaciones-por-dia',
      'leads-por-origen',
      'leads-por-persona',
      'cotizaciones-por-origen',
    ])
    expect(claves).not.toContain('margen-del-mes')
    expect(claves).not.toContain('cola-web')
  })

  it('con `logistica.margen.ver` en un solo origen sale el margen del mes, y la cola no', () => {
    const conMargen: Permisos = [
      ...CON_PERMISO,
      {
        clave: 'logistica.margen.ver',
        origenId: '7b0e1f6a-2c3d-4e5f-8a9b-0c1d2e3f4a5b',
        alcance: 'todos',
      },
    ]
    const claves = widgetsVisibles(conMargen).map((w) => w.clave)
    expect(claves).toContain('margen-del-mes')
    expect(claves).not.toContain('cola-web')
    expect(claves).toHaveLength(11)
  })

  it('con `web.cola.gestionar` sale la cola de la web; con sólo `logistica.margen.ver` no', () => {
    const conCola: Permisos = [
      ...CON_PERMISO,
      { clave: 'web.cola.gestionar', origenId: null, alcance: 'todos' },
    ]
    expect(widgetsVisibles(conCola).map((w) => w.clave)).toContain('cola-web')
    const soloMargen: Permisos = [
      { clave: 'logistica.margen.ver', origenId: null, alcance: 'todos' },
    ]
    expect(widgetsVisibles(soloMargen).map((w) => w.clave)).toEqual(['margen-del-mes'])
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
      'leads-por-dia',
      'cotizaciones-por-dia',
      'leads-por-origen',
      'leads-por-persona',
      'cotizaciones-por-origen',
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
      'leads-por-dia',
      'cotizaciones-por-dia',
      'leads-por-origen',
      'leads-por-persona',
      'cotizaciones-por-origen',
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
