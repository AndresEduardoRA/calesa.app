import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { pestanaDe, pestanasVisibles } from './pestanas'

const con = (clave: ClavePermiso, origenId: string | null = null): Permisos => [
  { clave, origenId, alcance: 'todos' },
]

describe('pestañas de Flujos', () => {
  it('«Fases», «Documentos» y «Reglas» las ve quien configura el flujo de algún origen o el de repuestos', () => {
    expect(pestanasVisibles(con('flujos.configurar')).map((p) => p.clave)).toEqual([
      'fases',
      'documentos',
      'reglas',
    ])
    expect(
      pestanasVisibles(con('flujos.configurar', '00000000-0000-4000-8000-000000000001')).map(
        (p) => p.clave,
      ),
    ).toEqual(['fases', 'documentos', 'reglas'])
    expect(pestanasVisibles(con('repuestos.configurar')).map((p) => p.clave)).toEqual([
      'fases',
      'documentos',
      'reglas',
    ])
  })

  it('con sólo los catálogos de logística ve «Documentos»; sin claves, ninguna', () => {
    expect(pestanasVisibles(con('logistica.catalogos.gestionar')).map((p) => p.clave)).toEqual([
      'documentos',
    ])
    expect(pestanasVisibles([])).toEqual([])
  })

  it('un valor ajeno de la URL abre la primera visible', () => {
    const visibles = [{ clave: 'fases' }, { clave: 'otra' }] as const
    expect(pestanaDe('otra', visibles)).toBe('otra')
    expect(pestanaDe('basura', visibles)).toBe('fases')
    expect(pestanaDe(undefined, visibles)).toBe('fases')
  })
})
