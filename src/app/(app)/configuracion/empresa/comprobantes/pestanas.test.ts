import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { PERMISOS_DE_EMPRESA, pestanasVisibles } from '../pestanas'
import { PESTANAS_DE_COMPROBANTES } from './pestanas'

const con = (...claves: string[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const })) as Permisos

const ve = (permisos: Permisos) =>
  pestanasVisibles(permisos).some((pestana) => pestana.clave === 'comprobantes')

// Quién ve la pestaña «Comprobantes» de Empresa (4.26-3; P1 a del 4.26, cierra 4-89).
describe('la pestaña «Comprobantes» de Empresa', () => {
  it('la ve quien gestiona los ajustes de la empresa', () => {
    expect(ve(con('empresa.ajustes.gestionar'))).toBe(true)
  })

  it('no la ve quien sólo gestiona tipos de cambio, ni quien sólo emite comprobantes', () => {
    expect(ve(con('empresa.tipos_cambio.gestionar'))).toBe(false)
    expect(ve(con('cotizaciones.comprobantes.emitir'))).toBe(false)
    expect(pestanasVisibles(con('cotizaciones.comprobantes.emitir'))).toEqual([])
  })

  it('no suma claves para entrar a Empresa: las suyas ya están entre las de la empresa', () => {
    for (const pestana of PESTANAS_DE_COMPROBANTES) {
      for (const clave of pestana.permisos) {
        expect(PERMISOS_DE_EMPRESA).toContain(clave)
      }
    }
    expect(PERMISOS_DE_EMPRESA).not.toContain('cotizaciones.comprobantes.emitir')
  })
})
