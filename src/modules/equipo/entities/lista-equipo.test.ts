import { describe, expect, it } from 'vitest'
import { filtroDelEquipoDesde, idsDelEquipoDesde, listaDelEquipoDesde } from './lista-equipo'

describe('filtroDelEquipoDesde', () => {
  it('sin nada en la URL: «En el equipo» y sin texto', () => {
    expect(filtroDelEquipoDesde({})).toEqual({ texto: '', estado: 'vigentes' })
  })

  it('lee el texto sin los espacios de los bordes y un estado de la lista', () => {
    expect(filtroDelEquipoDesde({ q: '  José Núñez ', estado: 'bloqueada' })).toEqual({
      texto: 'José Núñez',
      estado: 'bloqueada',
    })
    for (const estado of ['vigentes', 'activa', 'invitacion_pendiente', 'bloqueada', 'baja']) {
      expect(filtroDelEquipoDesde({ estado }).estado).toBe(estado)
    }
  })

  it('un estado que no existe vuelve a «En el equipo», sin error', () => {
    for (const estado of ['', 'xyz', 'BAJA', 'baja ', "'; drop table perfiles;--", '__proto__']) {
      expect(filtroDelEquipoDesde({ estado }).estado).toBe('vigentes')
    }
  })

  it('el texto se corta en 100 caracteres, también el que lleva emojis', () => {
    expect(filtroDelEquipoDesde({ q: 'a'.repeat(300) }).texto).toHaveLength(100)
    expect([...filtroDelEquipoDesde({ q: '😀'.repeat(300) }).texto]).toHaveLength(100)
  })

  it('los comodines y las comillas pasan tal cual: la base los trata como letras', () => {
    const q = String.raw`50% desc_uento \ "x" 'y'`
    expect(filtroDelEquipoDesde({ q }).texto).toBe(q)
  })
})

describe('idsDelEquipoDesde', () => {
  it('lee la lista de ids que devuelve la base', () => {
    const ids = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2']
    expect(idsDelEquipoDesde(ids)).toEqual(ids)
    expect(idsDelEquipoDesde([])).toEqual([])
  })

  it('una forma rota no pasa', () => {
    expect(() => idsDelEquipoDesde(['no-es-un-id'])).toThrow()
    expect(() => idsDelEquipoDesde({ id: 1 })).toThrow()
    expect(() => idsDelEquipoDesde(null)).toThrow()
  })
})

describe('listaDelEquipoDesde', () => {
  const fila = (n: number) => ({
    id: `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`,
    nombre: `Persona ${String(n)}`,
    email: `p${String(n)}@ejemplo.com`,
    avatar_ruta: null,
    activo: true,
    bloqueado: false,
    bloqueo_motivo: null,
    invitado_en: null,
    invitacion_aceptada_en: null,
    usuarios_roles: [],
  })
  const filas = (cuantas: number) => Array.from({ length: cuantas }, (_, n) => fila(n + 1))

  it('con una de más corta en el tope y dice que hay más', () => {
    const lista = listaDelEquipoDesde(filas(101), 100)
    expect(lista.personas).toHaveLength(100)
    expect(lista.hayMas).toBe(true)
    expect(lista.personas.at(-1)?.nombre).toBe('Persona 100')
  })

  it('con justo el tope, o menos, no hay más', () => {
    expect(listaDelEquipoDesde(filas(100), 100)).toMatchObject({ hayMas: false })
    expect(listaDelEquipoDesde(filas(100), 100).personas).toHaveLength(100)
    expect(listaDelEquipoDesde(filas(3), 100)).toMatchObject({ hayMas: false })
    expect(listaDelEquipoDesde([], 100)).toEqual({ personas: [], hayMas: false })
  })

  it('el tope por defecto es el de la lista del equipo (100)', () => {
    expect(listaDelEquipoDesde(filas(101)).personas).toHaveLength(100)
    expect(listaDelEquipoDesde(filas(101)).hayMas).toBe(true)
  })
})
