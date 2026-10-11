import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { NAVEGACION } from '../_shell/navegacion'
import { SECCIONES, seccionesVisibles } from './secciones'

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('secciones de configuración', () => {
  it('cada sección lleva a una pantalla que existe', () => {
    for (const seccion of SECCIONES) {
      expect(existsSync(path.join(APP, seccion.ruta, 'page.tsx')), seccion.ruta).toBe(true)
    }
  })

  it('quien puede abrir una sección ve «Configuración» en el menú', () => {
    const delMenu = NAVEGACION.find((entrada) => entrada.clave === 'configuracion')?.permisos ?? []
    for (const seccion of SECCIONES) {
      for (const clave of seccion.permisos) {
        expect(delMenu, clave).toContain(clave)
      }
    }
  })

  it('muestra sólo las secciones que la persona puede abrir', () => {
    const ver: Permisos = [{ clave: 'equipo.roles.ver', origenId: null, alcance: 'todos' }]
    const asesora: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'propios' }]
    expect(seccionesVisibles(ver).map((s) => s.clave)).toContain('roles')
    expect(seccionesVisibles(asesora)).toEqual([])
  })
})
