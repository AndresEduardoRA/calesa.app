import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PESTANAS_DE_VEHICULO,
  hayBarraDePestanas,
  pestanaDeVehiculo,
  pestanasDisponibles,
  pestanasVisibles,
} from './pestanas'

const claves = (pestanas: readonly { clave: string }[]) => pestanas.map((pestana) => pestana.clave)

describe('pestañas de la ficha de un vehículo', () => {
  it('una pestaña está disponible sólo si su sección existe', () => {
    for (const pestana of PESTANAS_DE_VEHICULO) {
      const existe = existsSync(`src/app/(app)/vehiculos/[id]/seccion-${pestana.clave}.tsx`)
      expect(pestana.disponible, `la pestaña «${pestana.clave}»`).toBe(existe)
    }
  })

  it('la ficha siempre está', () => {
    expect(claves(pestanasDisponibles())).toContain('ficha')
    expect(claves(pestanasVisibles({ cotizaciones: false, documentos: false }))).toContain('ficha')
  })

  it('«Cotizaciones» sale sólo para quien tiene cotizaciones.ver en el origen', () => {
    expect(claves(pestanasVisibles({ cotizaciones: true, documentos: false }))).toEqual([
      'ficha',
      'fotos',
      'cotizaciones',
    ])
    expect(claves(pestanasVisibles({ cotizaciones: false, documentos: false }))).toEqual([
      'ficha',
      'fotos',
    ])
  })

  it('«Documentos» sale sólo para quien tiene logistica.ver en el origen', () => {
    expect(claves(pestanasVisibles({ cotizaciones: false, documentos: true }))).toEqual([
      'ficha',
      'fotos',
      'documentos',
    ])
    expect(claves(pestanasVisibles({ cotizaciones: true, documentos: true }))).toEqual([
      'ficha',
      'fotos',
      'documentos',
      'cotizaciones',
    ])
  })

  it('las visibles llevan sólo clave y título, para cruzar al cliente', () => {
    expect(pestanasVisibles({ cotizaciones: true, documentos: false })[2]).toEqual({
      clave: 'cotizaciones',
      titulo: 'Cotizaciones',
    })
  })

  it('lo que no es una pestaña visible abre la ficha', () => {
    const con = pestanasVisibles({ cotizaciones: true, documentos: false })
    const sin = pestanasVisibles({ cotizaciones: false, documentos: false })
    expect(pestanaDeVehiculo(undefined, sin)).toBe('ficha')
    expect(pestanaDeVehiculo('fotos', sin)).toBe('fotos')
    // Sin la clave, el enlace con ?seccion=cotizaciones abre la ficha; con ella, la pestaña.
    expect(pestanaDeVehiculo('cotizaciones', sin)).toBe('ficha')
    expect(pestanaDeVehiculo('cotizaciones', con)).toBe('cotizaciones')
    // Sin `logistica.ver`, ?seccion=documentos abre la ficha; con ella, la pestaña.
    expect(pestanaDeVehiculo('documentos', con)).toBe('ficha')
    expect(
      pestanaDeVehiculo('documentos', pestanasVisibles({ cotizaciones: false, documentos: true })),
    ).toBe('documentos')
    // Declarada, pero todavía sin su sección.
    expect(pestanaDeVehiculo('repuestos', con)).toBe('ficha')
    expect(pestanaDeVehiculo('<script>', con)).toBe('ficha')
  })

  it('la barra aparece recién con dos pestañas visibles', () => {
    expect(hayBarraDePestanas(pestanasVisibles({ cotizaciones: false, documentos: false }))).toBe(
      true,
    )
    expect(hayBarraDePestanas([{ clave: 'ficha', titulo: 'Ficha' }])).toBe(false)
  })
})
