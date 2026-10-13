import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { DESTINOS_DE_PASO, conDestino } from './pasos'

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('destinos de los siguientes pasos', () => {
  it('cada paso con enlace lleva a una pantalla que existe', () => {
    for (const [clave, destino] of Object.entries(DESTINOS_DE_PASO)) {
      if (destino.ruta === null) {
        continue
      }
      const sinParametros = destino.ruta.split('?')[0] ?? ''
      expect(existsSync(path.join(APP, sinParametros, 'page.tsx')), clave).toBe(true)
    }
  })

  it('el flujo y la fórmula todavía no tienen pantalla: se dicen sin enlace', () => {
    expect(DESTINOS_DE_PASO.flujo.ruta).toBeNull()
    expect(DESTINOS_DE_PASO.formula.ruta).toBeNull()
  })
})

describe('conDestino', () => {
  const pasos = [
    { clave: 'permisos', titulo: 'x', detalle: 'y', pendiente: true },
    { clave: 'flujo', titulo: 'x', detalle: 'y', pendiente: true },
  ] as const

  it('sin el permiso, el paso con enlace dice por qué no se puede', () => {
    const [permisos, flujo] = conDestino(pasos, [])
    expect(permisos?.motivoDeshabilitado).toContain('Gestionar roles')
    // Sin pantalla no hay nada que habilitar ni deshabilitar.
    expect(flujo?.motivoDeshabilitado).toBeNull()
  })

  it('con el permiso, el enlace queda habilitado', () => {
    const gestiona: Permisos = [
      { clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' },
    ]
    const [permisos] = conDestino(pasos, gestiona)
    expect(permisos?.ruta).toBe('/configuracion/roles')
    expect(permisos?.motivoDeshabilitado).toBeNull()
  })
})
