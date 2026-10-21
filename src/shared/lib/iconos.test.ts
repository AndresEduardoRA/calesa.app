import { describe, expect, it } from 'vitest'
import {
  CLAVES_DE_ICONO,
  NOMBRE_DE_ICONO,
  esClaveDeIcono,
  iconoADibujar,
  nombreDelIcono,
} from './iconos'

describe('el catálogo de iconos', () => {
  it('son 24 claves distintas, en minúsculas y sin marcas', () => {
    expect(CLAVES_DE_ICONO).toHaveLength(24)
    expect(new Set(CLAVES_DE_ICONO).size).toBe(24)
    for (const clave of CLAVES_DE_ICONO) {
      expect(clave).toMatch(/^[a-z]+$/)
    }
  })

  it('cada clave tiene su nombre dicho con texto', () => {
    for (const clave of CLAVES_DE_ICONO) {
      expect(NOMBRE_DE_ICONO[clave].length).toBeGreaterThan(2)
    }
    expect(Object.keys(NOMBRE_DE_ICONO).sort()).toEqual([...CLAVES_DE_ICONO].sort())
  })
})

describe('esClaveDeIcono', () => {
  it('acepta una clave del catálogo y nada más', () => {
    expect(esClaveDeIcono('telefono')).toBe(true)
    expect(esClaveDeIcono('phone')).toBe(false)
    expect(esClaveDeIcono('Telefono')).toBe(false)
    expect(esClaveDeIcono('')).toBe(false)
    expect(esClaveDeIcono(null)).toBe(false)
    expect(esClaveDeIcono(5)).toBe(false)
    expect(esClaveDeIcono('constructor')).toBe(false)
  })
})

describe('iconoADibujar', () => {
  it('sin icono no hay nada que dibujar', () => {
    expect(iconoADibujar(null)).toEqual({ tipo: 'ninguno' })
    expect(iconoADibujar(undefined)).toEqual({ tipo: 'ninguno' })
    expect(iconoADibujar('')).toEqual({ tipo: 'ninguno' })
    expect(iconoADibujar('   ')).toEqual({ tipo: 'ninguno' })
  })

  it('una clave del catálogo se dibuja con la suya', () => {
    expect(iconoADibujar('casa')).toEqual({ tipo: 'clave', clave: 'casa' })
  })

  it('una clave que no se conoce cae en el icono neutro y no rompe', () => {
    expect(iconoADibujar('message-circle')).toEqual({ tipo: 'desconocido' })
    expect(iconoADibujar('<svg onload=x>')).toEqual({ tipo: 'desconocido' })
  })
})

describe('nombreDelIcono', () => {
  it('dice el nombre, o «Sin icono» si no hay o no se conoce', () => {
    expect(nombreDelIcono('ubicacion')).toBe('Ubicación')
    expect(nombreDelIcono(null)).toBe('Sin icono')
    expect(nombreDelIcono('marciano')).toBe('Sin icono')
  })
})
