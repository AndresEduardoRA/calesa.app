import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { NAVEGACION } from '../_shell/navegacion'
import { SECCION_DE_COTIZACION } from './cotizacion/seccion'
import { PERMISOS_DE_EMPRESA } from './empresa/pestanas'
import { SECCION_DE_FLUJOS } from './flujos/seccion'
import { SECCION_DE_REPUESTOS } from './repuestos/seccion'
import { SECCIONES, seccionesVisibles } from './secciones'
import { PESTANAS } from './web/pestanas'
import { SECCION_DE_WEB, SECCIONES_DE_WEB } from './web/seccion'

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('secciones de configuración', () => {
  it('son las de hoy, en su orden, y Cotización viene de la carpeta del carril B', () => {
    expect(SECCIONES.map((seccion) => seccion.clave)).toEqual([
      'empresa',
      'origenes',
      'leads',
      'cotizacion',
      'flujos',
      'logistica',
      'repuestos',
      ...(SECCIONES_DE_WEB.length > 0 ? ['web'] : []),
      'equipo',
      'roles',
    ])
    expect(SECCIONES[3]).toBe(SECCION_DE_COTIZACION)
    expect(SECCIONES[4]).toBe(SECCION_DE_FLUJOS)
    expect(SECCIONES[6]).toBe(SECCION_DE_REPUESTOS)
  })

  it('Sitio web figura sólo si alguna pestaña está llena, y su ruta existe igual', () => {
    expect(SECCIONES_DE_WEB.length > 0).toBe(PESTANAS.some((pestana) => pestana.llena))
    expect(SECCIONES.some((seccion) => seccion.clave === 'web')).toBe(SECCIONES_DE_WEB.length > 0)
    expect(existsSync(path.join(APP, SECCION_DE_WEB.ruta, 'page.tsx'))).toBe(true)
  })

  it('Empresa se abre con los permisos de todas sus pestañas', () => {
    expect(SECCIONES[0].permisos).toBe(PERMISOS_DE_EMPRESA)
  })

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
