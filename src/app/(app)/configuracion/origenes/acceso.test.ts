import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { puedeAbrirOrigenes } from './acceso'

const con = (clave: string): Permisos => [{ clave, origenId: null, alcance: 'todos' }] as Permisos

describe('puedeAbrirOrigenes', () => {
  it('abre quien gestiona orígenes', () => {
    expect(puedeAbrirOrigenes(con('origenes.gestionar'))).toBe(true)
  })

  it('abre quien configura el flujo o la fórmula de un origen', () => {
    expect(puedeAbrirOrigenes(con('flujos.configurar'))).toBe(true)
    expect(puedeAbrirOrigenes(con('cotizaciones.configurar'))).toBe(true)
  })

  it('una asesora sin esos permisos no entra', () => {
    expect(puedeAbrirOrigenes(con('leads.ver'))).toBe(false)
    expect(puedeAbrirOrigenes([])).toBe(false)
  })

  it('quien tiene el permiso sólo en un origen también entra', () => {
    const acotado: Permisos = [
      {
        clave: 'flujos.configurar',
        origenId: '00000000-0000-0000-0000-00000000000a',
        alcance: 'todos',
      },
    ]
    expect(puedeAbrirOrigenes(acotado)).toBe(true)
  })
})
