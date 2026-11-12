import { describe, expect, it } from 'vitest'
import { especialidadesDeTexto, esHandle, esWhatsapp, textoDeEspecialidades } from './ficha'

describe('esWhatsapp', () => {
  it('pide + y de 7 a 15 dígitos sin empezar en 0', () => {
    expect(esWhatsapp('+59170000000')).toBe(true)
    expect(esWhatsapp('+1234567')).toBe(true)
    expect(esWhatsapp('+123456789012345')).toBe(true)
  })

  it('rechaza lo que el check de la base rechaza', () => {
    expect(esWhatsapp('59170000000')).toBe(false)
    expect(esWhatsapp('+0591700000')).toBe(false)
    expect(esWhatsapp('+123456')).toBe(false)
    expect(esWhatsapp('+1234567890123456')).toBe(false)
    expect(esWhatsapp('+591 7000 0000')).toBe(false)
    expect(esWhatsapp('')).toBe(false)
  })
})

describe('esHandle', () => {
  it('vale con minúsculas, números y . _ - entre 3 y 30 caracteres', () => {
    expect(esHandle('rosa.mamani')).toBe(true)
    expect(esHandle('ana_2-b')).toBe(true)
    expect(esHandle('abc')).toBe(true)
    expect(esHandle('a'.repeat(30))).toBe(true)
  })

  it('rechaza mayúsculas, espacios, símbolos, bordes con signo y largos fuera de rango', () => {
    expect(esHandle('ab')).toBe(false)
    expect(esHandle('a'.repeat(31))).toBe(false)
    expect(esHandle('Rosa')).toBe(false)
    expect(esHandle('ro sa')).toBe(false)
    expect(esHandle('rosa!')).toBe(false)
    expect(esHandle('.rosa')).toBe(false)
    expect(esHandle('rosa-')).toBe(false)
    expect(esHandle('')).toBe(false)
  })
})

describe('especialidadesDeTexto', () => {
  it('separa por coma, recorta, quita vacías y repetidas sin distinguir mayúsculas', () => {
    expect(especialidadesDeTexto(' SUV ,  camionetas  4x4, , suv,Eléctricos ')).toEqual([
      'SUV',
      'camionetas 4x4',
      'Eléctricos',
    ])
    expect(especialidadesDeTexto('')).toEqual([])
  })

  it('ida y vuelta con textoDeEspecialidades', () => {
    expect(textoDeEspecialidades(['SUV', 'Eléctricos'])).toBe('SUV, Eléctricos')
    expect(especialidadesDeTexto(textoDeEspecialidades(['SUV', 'Eléctricos']))).toEqual([
      'SUV',
      'Eléctricos',
    ])
  })
})
