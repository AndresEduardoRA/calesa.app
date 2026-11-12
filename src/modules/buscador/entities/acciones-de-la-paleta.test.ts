import { describe, expect, it } from 'vitest'
import { filtrarAcciones, TOPE_DE_ACCIONES, type AccionDeLaPaleta } from './acciones-de-la-paleta'

const accion = (
  clave: string,
  titulo: string,
  palabras: string[] = [],
  grupo: AccionDeLaPaleta['grupo'] = 'ir',
): AccionDeLaPaleta => ({
  clave,
  titulo,
  grupo,
  palabras,
  destino: { tipo: 'ruta', ruta: `/${clave}` },
})

const ACCIONES = [
  accion('inventario', 'Ir a Inventario', ['vehiculos', 'autos']),
  accion('nuevo-lead', 'Nuevo lead', ['crear', 'cliente'], 'crear'),
  accion('cotizaciones', 'Ir a Cotizaciones', ['cotizar']),
  accion('nueva-cotizacion', 'Nueva cotización', ['crear', 'cotizar'], 'crear'),
  accion('agenda', 'Ir a Agenda', ['nueva tarea', 'recordatorios']),
]

const claves = (acciones: readonly AccionDeLaPaleta[]) => acciones.map((a) => a.clave)

describe('filtrarAcciones', () => {
  it('sin texto salen todas en su orden', () => {
    expect(claves(filtrarAcciones(ACCIONES, ''))).toEqual(claves(ACCIONES))
    expect(claves(filtrarAcciones(ACCIONES, '   '))).toEqual(claves(ACCIONES))
  })

  it('las que empiezan con la primera palabra van antes que las que la traen en medio', () => {
    expect(claves(filtrarAcciones(ACCIONES, 'nue'))).toEqual([
      'nuevo-lead',
      'nueva-cotizacion',
      'agenda',
    ])
  })

  it('pliega mayúsculas y tildes', () => {
    expect(claves(filtrarAcciones(ACCIONES, 'COTIZACION'))).toEqual([
      'cotizaciones',
      'nueva-cotizacion',
    ])
    expect(claves(filtrarAcciones(ACCIONES, 'cotización'))).toEqual([
      'cotizaciones',
      'nueva-cotizacion',
    ])
  })

  it('cada palabra del texto tiene que coincidir', () => {
    expect(claves(filtrarAcciones(ACCIONES, 'nueva cot'))).toEqual(['nueva-cotizacion'])
    expect(claves(filtrarAcciones(ACCIONES, 'nueva zzz'))).toEqual([])
  })

  it('encuentra por las palabras de apoyo', () => {
    expect(claves(filtrarAcciones(ACCIONES, 'autos'))).toEqual(['inventario'])
  })

  it('una acción sin coincidencia sale', () => {
    expect(claves(filtrarAcciones(ACCIONES, 'xyz'))).toEqual([])
  })

  it('con texto el resultado tiene tope', () => {
    const muchas = Array.from({ length: 20 }, (_, i) =>
      accion(`a${String(i)}`, `Ir a ${String(i)}`),
    )
    expect(filtrarAcciones(muchas, 'ir')).toHaveLength(TOPE_DE_ACCIONES)
    expect(filtrarAcciones(muchas, '')).toHaveLength(20)
  })
})
