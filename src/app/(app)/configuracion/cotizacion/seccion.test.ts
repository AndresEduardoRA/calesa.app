import { describe, expect, it } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'
import { SECCION_DE_COTIZACION } from './seccion'

// Los permisos de Configuración › Cotización se fijan aquí, en la carpeta del carril B: los de los niveles de acceso y, desde el 4.20-2a, el de la fórmula.
describe('la sección Cotización de Configuración', () => {
  it('tiene su clave, su ruta y se abre también con configurar la fórmula', () => {
    expect(SECCION_DE_COTIZACION.clave).toBe('cotizacion')
    expect(SECCION_DE_COTIZACION.ruta).toBe(RUTAS.configuracionDeCotizacion)
    expect([...SECCION_DE_COTIZACION.permisos]).toEqual([
      'equipo.roles.ver',
      'equipo.roles.gestionar',
      'cotizaciones.configurar',
    ])
  })

  it('su descripción nombra la fórmula y la vigencia', () => {
    expect(SECCION_DE_COTIZACION.descripcion).toBe(
      'La fórmula de cada origen, la vigencia y los niveles de acceso de la hoja.',
    )
  })
})
