import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PESTANAS_DE_VEHICULO,
  hayBarraDePestanas,
  pestanaDeVehiculo,
  pestanasDisponibles,
} from './pestanas'

describe('pestañas de la ficha de un vehículo', () => {
  it('una pestaña está disponible sólo si su sección existe', () => {
    for (const pestana of PESTANAS_DE_VEHICULO) {
      const existe = existsSync(`src/app/(app)/vehiculos/[id]/seccion-${pestana.clave}.tsx`)
      expect(pestana.disponible, `la pestaña «${pestana.clave}»`).toBe(existe)
    }
  })

  it('la ficha siempre está', () => {
    expect(pestanasDisponibles().map((pestana) => pestana.clave)).toContain('ficha')
  })

  it('lo que no es una pestaña disponible abre la ficha', () => {
    expect(pestanaDeVehiculo(undefined)).toBe('ficha')
    expect(pestanaDeVehiculo('fotos')).toBe('fotos')
    // Declarada, pero todavía sin su sección.
    expect(pestanaDeVehiculo('documentos')).toBe('ficha')
    expect(pestanaDeVehiculo('<script>')).toBe('ficha')
  })

  it('la barra aparece recién con dos pestañas', () => {
    expect(hayBarraDePestanas()).toBe(pestanasDisponibles().length > 1)
  })
})
