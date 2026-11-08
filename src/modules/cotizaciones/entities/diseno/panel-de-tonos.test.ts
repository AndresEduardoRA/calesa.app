import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DE_TONO_NO_DISPONIBLE,
  firmaDeTonos,
  hayCambiosEnElTono,
  motivoParaNoAbrirTono,
  motivoParaNoEliminarTono,
} from './panel-de-tonos'
import { coloresDeUnTonoNuevo, type Tono } from './tonos'

const tono = (id: string, nombre = 'Dorado', hora = 'h1'): Tono => ({
  id,
  clave: nombre.toLowerCase(),
  nombre,
  actualizadoEn: hora,
  colores: coloresDeUnTonoNuevo(),
})

describe('el panel de tonos', () => {
  it('abrir: «Nuevo» no abre en el tope; «Editar» no abre uno que no está', () => {
    const lleno = { tope: 2, tonos: [tono('a'), tono('b', 'Verde')] }
    expect(motivoParaNoAbrirTono(lleno, 'nuevo', null)).toBe(
      'Ya hay 2 tonos, que es el máximo. Elimina uno que ningún grupo use.',
    )
    expect(motivoParaNoAbrirTono({ ...lleno, tope: 3 }, 'nuevo', null)).toBeNull()
    expect(motivoParaNoAbrirTono(lleno, 'editar', 'a')).toBeNull()
    expect(motivoParaNoAbrirTono(lleno, 'editar', 'z')).toBe(MOTIVO_DE_TONO_NO_DISPONIBLE)
    expect(motivoParaNoAbrirTono(lleno, 'editar', null)).toBe(MOTIVO_DE_TONO_NO_DISPONIBLE)
    expect(motivoParaNoAbrirTono(lleno, null, null)).toBeNull()
    expect(motivoParaNoEliminarTono(lleno.tonos, 'b')).toBeNull()
    expect(motivoParaNoEliminarTono(lleno.tonos, 'z')).toBe(MOTIVO_DE_TONO_NO_DISPONIBLE)
  })

  it('la firma cambia con la versión de un tono, con uno que falta o con el tope', () => {
    const base = { tope: 24, tonos: [tono('a'), tono('b')] }
    const firma = firmaDeTonos(base)
    expect(firmaDeTonos({ ...base, tonos: [tono('a'), tono('b')] })).toBe(firma)
    expect(firmaDeTonos({ ...base, tonos: [tono('a'), tono('b', 'Dorado', 'h2')] })).not.toBe(firma)
    expect(firmaDeTonos({ ...base, tonos: [tono('a')] })).not.toBe(firma)
    expect(firmaDeTonos({ ...base, tope: 10 })).not.toBe(firma)
  })

  it('hay cambios si el nombre o un color difieren; los espacios y las mayúsculas no cuentan', () => {
    const original = tono('a')
    const colores = coloresDeUnTonoNuevo()
    expect(hayCambiosEnElTono(original, '  Dorado ', colores)).toBe(false)
    expect(hayCambiosEnElTono(original, 'Otro', colores)).toBe(true)
    colores.claro.fondo = ' #FFF7D6 '
    expect(hayCambiosEnElTono(original, 'Dorado', colores)).toBe(false)
    colores.claro.fondo = '#ffffff'
    expect(hayCambiosEnElTono(original, 'Dorado', colores)).toBe(true)
    // Al crear: nada escrito = la paleta de partida y un nombre vacío.
    expect(hayCambiosEnElTono(null, '', coloresDeUnTonoNuevo())).toBe(false)
    expect(hayCambiosEnElTono(null, 'Nuevo', coloresDeUnTonoNuevo())).toBe(true)
  })
})
