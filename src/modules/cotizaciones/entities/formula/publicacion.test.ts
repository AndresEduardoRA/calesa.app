import { describe, expect, it } from 'vitest'
import {
  LARGO_MAXIMO_DE_NOTA,
  MENSAJE_DE_NOTA_VACIA,
  MOTIVO_SIN_PERMISO_DE_FORMULA,
  PANEL_PUBLICAR_FORMULA,
  esquemaDeNota,
  motivoDeNota,
  motivoParaNoAbrirPublicar,
  noDisponibleAlPublicar,
} from './publicacion'
import type { BorradorDelOrigen, EstadoDeLaFormula, PublicadaDelOrigen } from './versiones'

const V1 = '00000000-0000-4000-8000-000000000001'
const V2 = '00000000-0000-4000-8000-000000000002'

const publicada = (id: string, version: number): PublicadaDelOrigen => ({
  id,
  version,
  nota: null,
  publicadoPor: null,
  publicadoEn: null,
})
const borrador = (versionOrigenId: string | null): BorradorDelOrigen => ({
  id: '00000000-0000-4000-8000-000000000050',
  nota: null,
  creadoPor: null,
  actualizadoEn: '2026-11-06T10:00:00+00:00',
  versionOrigenId,
  versionDeOrigen: null,
})
const estado = (p: PublicadaDelOrigen | null, b: BorradorDelOrigen | null): EstadoDeLaFormula => ({
  publicada: p,
  borrador: b,
})

describe('esquemaDeNota y motivoDeNota', () => {
  it('vacía o sólo espacios: «Publicar pide una nota.»', () => {
    expect(MENSAJE_DE_NOTA_VACIA).toBe('Publicar pide una nota.')
    expect(motivoDeNota('')).toBe('Publicar pide una nota.')
    expect(motivoDeNota('   \n ')).toBe('Publicar pide una nota.')
  })

  it('más de 2.000 caracteres: lo dice; 2.000 justos pasan', () => {
    expect(LARGO_MAXIMO_DE_NOTA).toBe(2000)
    expect(motivoDeNota('a'.repeat(2001))).toBe('La nota pasa de 2.000 caracteres.')
    expect(motivoDeNota('a'.repeat(2000))).toBeNull()
  })

  it('viaja recortada', () => {
    expect(esquemaDeNota.parse('  Subo el flete  ')).toBe('Subo el flete')
    expect(motivoDeNota(' hola ')).toBeNull()
  })
})

describe('motivoParaNoAbrirPublicar (al llegar por la URL)', () => {
  it('sin borrador no abre', () => {
    expect(motivoParaNoAbrirPublicar(estado(publicada(V1, 1), null))).toBe(
      'No hay borrador para publicar.',
    )
  })

  it('un borrador atrasado no abre', () => {
    expect(motivoParaNoAbrirPublicar(estado(publicada(V2, 2), borrador(V1)))).toBe(
      'Ese borrador ya no se puede publicar: después de que empezó se publicó otra versión.',
    )
  })

  it('al día, o el primero de un origen sin publicada, abre', () => {
    expect(motivoParaNoAbrirPublicar(estado(publicada(V1, 1), borrador(V1)))).toBeNull()
    expect(motivoParaNoAbrirPublicar(estado(null, borrador(null)))).toBeNull()
    expect(motivoParaNoAbrirPublicar(estado(publicada(V1, 1), borrador(null)))).toBeNull()
  })
})

describe('noDisponibleAlPublicar (con el modal abierto)', () => {
  it('el borrador ya no está', () => {
    expect(noDisponibleAlPublicar(estado(publicada(V2, 2), null))).toBe(
      'El borrador ya no está: otra persona lo publicó o lo descartó.',
    )
  })

  it('se publicó otra después de que empezó: dice cuál', () => {
    expect(noDisponibleAlPublicar(estado(publicada(V2, 2), borrador(V1)))).toBe(
      'Después de que empezó este borrador se publicó la versión 2: ya no se puede publicar.',
    )
  })

  it('al día, nada', () => {
    expect(noDisponibleAlPublicar(estado(publicada(V1, 1), borrador(V1)))).toBeNull()
    expect(noDisponibleAlPublicar(estado(null, borrador(null)))).toBeNull()
  })
})

describe('las claves y los textos', () => {
  it('el panel y el motivo sin permiso', () => {
    expect(PANEL_PUBLICAR_FORMULA).toBe('publicar-formula')
    expect(MOTIVO_SIN_PERMISO_DE_FORMULA).toBe(
      'No tienes permiso para configurar la fórmula de este origen.',
    )
  })
})
