import { describe, expect, it } from 'vitest'
import {
  avisoDelPortalAlTransferir,
  codigoDictado,
  nombreDeQuien,
  textoParaWhatsApp,
} from './portal-mensaje'

describe('codigoDictado', () => {
  it('cada símbolo con su nombre, y el guion', () => {
    expect(codigoDictado('MII-4F2K9')).toBe('eme, i, i, guion, cuatro, efe, dos, ka, nueve')
  })
  it('be y ve se distinguen; en minúsculas también', () => {
    expect(codigoDictado('bv-w')).toBe('be larga, ve corta, guion, doble ve')
  })
  it('todo el alfabeto del código tiene nombre', () => {
    for (const simbolo of '23456789ABCDEFGHJKLMNPQRSTUVWXYZIO') {
      expect(codigoDictado(simbolo)).not.toBe(simbolo)
    }
  })
})

describe('textoParaWhatsApp', () => {
  const datos = {
    cliente: 'Ana Rojas',
    empresa: 'Importadora Sol',
    codigo: 'IMP-4F2K9',
    clave: 'K7M2P9QX3A',
  }
  it('con la dirección configurada lleva el enlace', () => {
    expect(textoParaWhatsApp({ ...datos, direccion: 'https://sol.bo' })).toBe(
      [
        'Hola, Ana Rojas.',
        'Ya tienes acceso a tu seguimiento en Importadora Sol.',
        'Para ver cómo va tu compra, entra en https://sol.bo con estos datos:',
        'Código: IMP-4F2K9',
        'Clave temporal: K7M2P9QX3A',
        'Al entrar te pediremos que cambies la clave.',
      ].join('\n'),
    )
  })
  it('sin dirección no inventa una: nombra la web de la empresa', () => {
    const texto = textoParaWhatsApp({ ...datos, direccion: null })
    expect(texto).toContain('entra en la web de Importadora Sol con estos datos:')
    expect(texto).not.toMatch(/https?:/)
  })
  it('un lead sin nombre saluda sin nombre', () => {
    expect(textoParaWhatsApp({ ...datos, cliente: '  ', direccion: null })).toMatch(/^Hola\.\n/)
  })
})

describe('nombreDeQuien', () => {
  it('el nombre; si se dio de baja, lo dice; si la cuenta ya no existe, sin nombre', () => {
    expect(nombreDeQuien({ nombre: 'Rosa Mamani', deBaja: false })).toBe('Rosa Mamani')
    expect(nombreDeQuien({ nombre: 'Rosa Mamani', deBaja: true })).toBe(
      'Rosa Mamani (ya no está en el equipo)',
    )
    expect(nombreDeQuien(null)).toBe('alguien que ya no está en el equipo')
  })
})

describe('avisoDelPortalAlTransferir', () => {
  it('nombra a quien lo recibe en cuanto se elige', () => {
    expect(avisoDelPortalAlTransferir('Ana Rojas', null)).toBe(
      'Ana Rojas tiene acceso al portal: verá como su asesor a quien se lo pases.',
    )
    expect(avisoDelPortalAlTransferir('Ana Rojas', 'Juan Pérez')).toBe(
      'Ana Rojas tiene acceso al portal: desde ahora verá a Juan Pérez como su asesor.',
    )
  })
})
