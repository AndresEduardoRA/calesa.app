import { describe, expect, it } from 'vitest'
import type { Concesion, Permisos } from '@/shared/lib/permisos'
import { PANEL_NUEVO_DE_VEHICULOS } from '@/shared/lib/rutas'
import { accionesDeLaPaleta } from './acciones-de-la-paleta'

function concesiones(...claves: Concesion['clave'][]): Permisos {
  return claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
}

const titulos = (permisos: Permisos) => accionesDeLaPaleta(permisos).map((a) => a.titulo)
const porClave = (permisos: Permisos, clave: string) =>
  accionesDeLaPaleta(permisos).find((a) => a.clave === clave)

describe('accionesDeLaPaleta: crear', () => {
  const asesora = concesiones('leads.crear', 'cotizaciones.crear', 'vehiculos.ver')

  it('ofrece sólo lo que el permiso deja crear', () => {
    expect(titulos(asesora)).toContain('Nuevo lead')
    expect(titulos(asesora)).toContain('Nueva cotización')
    expect(titulos(asesora)).not.toContain('Nuevo vehículo')
  })

  it('sin ningún permiso de crear no hay grupo «crear»', () => {
    const acciones = accionesDeLaPaleta(concesiones('vehiculos.ver'))
    expect(acciones.some((a) => a.grupo === 'crear')).toBe(false)
  })

  it('«Nuevo lead» abre el alta y «Nueva cotización» va a la hoja', () => {
    expect(porClave(asesora, 'nuevo-lead')?.destino).toEqual({ tipo: 'nuevo-lead' })
    expect(porClave(asesora, 'nueva-cotizacion')?.destino).toEqual({
      tipo: 'ruta',
      ruta: '/cotizaciones/nuevo',
    })
  })

  it('«Nuevo vehículo» abre el panel de alta con el valor compartido', () => {
    const dueña = concesiones('vehiculos.crear')
    expect(porClave(dueña, 'nuevo-vehiculo')?.destino).toEqual({
      tipo: 'ruta',
      ruta: `/vehiculos?panel=${PANEL_NUEVO_DE_VEHICULOS}`,
    })
  })
})

describe('accionesDeLaPaleta: ir a', () => {
  it('sin permiso de ver el equipo no hay «Configuración: Equipo»', () => {
    expect(titulos(concesiones('leads.crear'))).not.toContain('Configuración: Equipo')
  })

  it('con permiso de ver el equipo sí, y lleva a su ruta', () => {
    const accion = accionesDeLaPaleta(concesiones('equipo.usuarios.ver')).find(
      (a) => a.titulo === 'Configuración: Equipo',
    )
    expect(accion?.destino).toEqual({ tipo: 'ruta', ruta: '/configuracion/equipo' })
  })

  it('las entradas del menú visibles salen como «Ir a …»', () => {
    expect(titulos(concesiones())).toContain('Ir a Inicio')
  })
})

describe('accionesDeLaPaleta: forma', () => {
  it('«Ver atajos de teclado» siempre está', () => {
    expect(porClave([], 'ver-atajos')?.destino).toEqual({ tipo: 'atajos' })
  })

  it('son datos simples: ni iconos ni permisos cruzan al navegador', () => {
    const acciones = accionesDeLaPaleta(
      concesiones('leads.crear', 'vehiculos.crear', 'cotizaciones.crear', 'equipo.usuarios.ver'),
    )
    for (const accion of acciones) {
      expect(Object.keys(accion).sort()).toEqual([
        'clave',
        'destino',
        'grupo',
        'palabras',
        'titulo',
      ])
    }
    expect(JSON.parse(JSON.stringify(acciones))).toEqual(acciones)
  })

  it('las claves no se repiten (son el value de cada fila)', () => {
    const claves = accionesDeLaPaleta(
      concesiones('leads.crear', 'vehiculos.crear', 'cotizaciones.crear', 'equipo.usuarios.ver'),
    ).map((a) => a.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })
})
