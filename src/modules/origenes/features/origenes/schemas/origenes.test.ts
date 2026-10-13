import { describe, expect, it } from 'vitest'
import { esquemaCrearOrigen, esquemaGuardarOrigen } from './origenes'

const VALIDO = {
  nombre: 'Corea',
  sustantivo: 'vehículo',
  genero: 'm',
  tipo: 'manual',
  color: '#027a48',
  plataformas: [],
}

describe('esquemaCrearOrigen', () => {
  it('acepta un origen manual bien formado y limpia los espacios', () => {
    const resultado = esquemaCrearOrigen.parse({ ...VALIDO, nombre: '  Corea  ' })
    expect(resultado.nombre).toBe('Corea')
  })

  it('pide un nombre', () => {
    const r = esquemaCrearOrigen.safeParse({ ...VALIDO, nombre: ' ' })
    expect(r.success).toBe(false)
  })

  it('el sustantivo lleva sólo letras', () => {
    expect(esquemaCrearOrigen.safeParse({ ...VALIDO, sustantivo: 'v3hículo' }).success).toBe(false)
    expect(esquemaCrearOrigen.safeParse({ ...VALIDO, sustantivo: 'unidad usada' }).success).toBe(
      true,
    )
  })

  it('un origen manual no lleva plataformas de apibara', () => {
    const r = esquemaCrearOrigen.safeParse({ ...VALIDO, plataformas: ['copart'] })
    expect(r.success).toBe(false)
  })

  it('uno de subasta sí, y sólo las que apibara conoce', () => {
    expect(
      esquemaCrearOrigen.safeParse({ ...VALIDO, tipo: 'subasta', plataformas: ['copart'] }).success,
    ).toBe(true)
    expect(
      esquemaCrearOrigen.safeParse({ ...VALIDO, tipo: 'subasta', plataformas: ['ebay'] }).success,
    ).toBe(false)
  })

  it('rechaza un color que no es hexadecimal', () => {
    expect(esquemaCrearOrigen.safeParse({ ...VALIDO, color: 'verde' }).success).toBe(false)
  })
})

describe('esquemaGuardarOrigen', () => {
  const ID = '00000000-0000-0000-0000-00000000000a'

  it('pide la versión que tenía en pantalla', () => {
    expect(esquemaGuardarOrigen.safeParse({ id: ID, nombre: 'Otro' }).success).toBe(false)
    expect(
      esquemaGuardarOrigen.safeParse({ id: ID, actualizadoEnEsperado: 'x', nombre: 'Otro' })
        .success,
    ).toBe(true)
  })

  it('no deja cambiar el tipo', () => {
    const r = esquemaGuardarOrigen.parse({ id: ID, actualizadoEnEsperado: 'x', tipo: 'subasta' })
    expect('tipo' in r).toBe(false)
  })
})
