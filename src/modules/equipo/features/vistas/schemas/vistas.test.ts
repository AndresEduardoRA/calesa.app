import { describe, expect, it } from 'vitest'
import { esquemaEliminarVista, esquemaGuardarVista } from './vistas'

describe('esquemaGuardarVista', () => {
  it('recorta el nombre y acepta los filtros como parámetros de URL', () => {
    const vista = esquemaGuardarVista.parse({
      pantalla: 'vehiculos',
      nombre: '  Automáticos  ',
      params: { origen: 'o', 'a.transmision': 'automatica' },
    })
    expect(vista.nombre).toBe('Automáticos')
  })

  it('pide un nombre, una pantalla que guarde vistas y parámetros de texto', () => {
    const base = { pantalla: 'vehiculos', nombre: 'A', params: {} }
    expect(esquemaGuardarVista.safeParse({ ...base, nombre: '   ' }).success).toBe(false)
    expect(esquemaGuardarVista.safeParse({ ...base, nombre: 'x'.repeat(41) }).success).toBe(false)
    expect(esquemaGuardarVista.safeParse({ ...base, pantalla: 'configuracion' }).success).toBe(
      false,
    )
    expect(esquemaGuardarVista.safeParse({ ...base, params: { anio: 2015 } }).success).toBe(false)
  })
})

describe('esquemaEliminarVista', () => {
  it('pide el id de la vista', () => {
    expect(esquemaEliminarVista.safeParse({ pantalla: 'vehiculos', id: 'x' }).success).toBe(false)
  })
})
