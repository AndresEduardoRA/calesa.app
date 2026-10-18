import { describe, expect, it } from 'vitest'
import {
  BLOQUES_DEL_MENU_DE_VEHICULO,
  ETIQUETA_DE_ACCION_DE_VEHICULO,
  accionesDeVehiculo,
  type ClaveDeAccionDeVehiculo,
} from './acciones-de-vehiculo'

describe('accionesDeVehiculo', () => {
  it('con todo, el orden es: editar, publicar y, separada, la papelera', () => {
    expect(
      accionesDeVehiculo({ editar: 'habilitada', publicar: 'habilitada', papelera: 'habilitada' }),
    ).toEqual([['editar', 'publicar'], ['papelera']])
  })

  it('lo que no se ofrece no aparece, y no queda un bloque vacío', () => {
    expect(
      accionesDeVehiculo({ editar: 'oculta', publicar: 'oculta', papelera: 'habilitada' }),
    ).toEqual([['papelera']])
    expect(
      accionesDeVehiculo({ editar: 'habilitada', publicar: 'oculta', papelera: 'oculta' }),
    ).toEqual([['editar']])
    expect(
      accionesDeVehiculo({ editar: 'oculta', publicar: 'oculta', papelera: 'oculta' }),
    ).toEqual([])
  })

  it('una apagada sigue en su lugar (se ve y dice por qué)', () => {
    expect(
      accionesDeVehiculo({ editar: 'oculta', publicar: 'apagada', papelera: 'apagada' }),
    ).toEqual([['publicar'], ['papelera']])
  })

  it('cada acción está en un solo bloque y tiene su texto', () => {
    const claves = BLOQUES_DEL_MENU_DE_VEHICULO.flat() as ClaveDeAccionDeVehiculo[]
    expect(new Set(claves).size).toBe(claves.length)
    expect([...claves].sort()).toEqual(Object.keys(ETIQUETA_DE_ACCION_DE_VEHICULO).sort())
    expect(ETIQUETA_DE_ACCION_DE_VEHICULO.papelera).toBe('Enviar a la papelera')
    for (const texto of Object.values(ETIQUETA_DE_ACCION_DE_VEHICULO)) {
      expect(texto).not.toMatch(/[!¡]/)
    }
  })

  it('la papelera es lo último: lo destructivo al final y separado de lo frecuente', () => {
    const bloques = accionesDeVehiculo({
      editar: 'habilitada',
      publicar: 'habilitada',
      papelera: 'habilitada',
    })
    expect(bloques.at(-1)).toEqual(['papelera'])
    expect(bloques.slice(0, -1).flat()).not.toContain('papelera')
  })
})
