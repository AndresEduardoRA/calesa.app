import { describe, expect, it } from 'vitest'
import {
  claveDelBorradorDeSeguimiento,
  hayCambiosEnSeguimiento,
  seguimientoConVersionNueva,
  seguimientoParaEditar,
  valoresDelSeguimiento,
} from './edicion-de-seguimiento'
import type { Seguimiento, ValoresDelSeguimiento } from './seguimiento'
import { SIN_VEHICULO } from './vehiculo-de-nota'

const ZONA = 'America/La_Paz'
const TIPOS = [
  { id: 't1', clave: 'llamada', nombre: 'Llamada', icono: null },
  { id: 't2', clave: 'visita', nombre: 'Visita', icono: null },
]

const uno = (cambios: Partial<Seguimiento> = {}): Seguimiento => ({
  id: 's1',
  leadId: 'l1',
  tipoId: 't2',
  tipoNombre: 'Visita',
  tipoIcono: null,
  titulo: 'Vino a ver el RAV4',
  detalleDoc: null,
  detalleTexto: 'Le gustó',
  visibilidad: 'publico',
  ocurridoEn: '2026-10-15T14:00:00+00:00',
  actualizadoEn: '2026-10-15T14:00:00.123456+00:00',
  eliminado: false,
  autorId: 'yo',
  autorNombre: null,
  esMio: true,
  ...SIN_VEHICULO,
  ...cambios,
})

describe('seguimientoParaEditar', () => {
  it('lo propio con la cartera se edita', () => {
    expect(seguimientoParaEditar([uno()], 's1', true)).toEqual({
      tipo: 'editable',
      seguimiento: uno(),
    })
  })
  it('lo ajeno, lo que no está y todo sin la cartera «no está», igual', () => {
    expect(seguimientoParaEditar([uno({ esMio: false })], 's1', true)).toEqual({ tipo: 'no_esta' })
    expect(seguimientoParaEditar([uno()], 'otro', true)).toEqual({ tipo: 'no_esta' })
    expect(seguimientoParaEditar([uno()], 's1', false)).toEqual({ tipo: 'no_esta' })
  })
})

describe('valoresDelSeguimiento', () => {
  it('al anotar: el primer tipo activo y nada escrito', () => {
    expect(valoresDelSeguimiento(null, TIPOS, ZONA)).toMatchObject({
      tipoId: 't1',
      titulo: '',
      detalle: null,
      visible: false,
      ocurridoEn: '',
      recordatorio: '',
    })
  })
  it('al editar: lo guardado, la fecha en la zona y el texto del alta como documento', () => {
    const valores = valoresDelSeguimiento(uno(), TIPOS, ZONA)
    expect(valores).toMatchObject({
      tipoId: 't2',
      titulo: 'Vino a ver el RAV4',
      visible: true,
      ocurridoEn: '2026-10-15T10:00',
      recordatorio: '',
    })
    expect(JSON.stringify(valores.detalle)).toContain('Le gustó')
  })
})

describe('hayCambiosEnSeguimiento', () => {
  const inicial = valoresDelSeguimiento(null, TIPOS, ZONA)
  it('sin tocar nada no hay cambios; cambiar sólo el tipo, sí', () => {
    expect(hayCambiosEnSeguimiento({ ...inicial }, inicial)).toBe(false)
    expect(hayCambiosEnSeguimiento({ ...inicial, tipoId: 't2' }, inicial)).toBe(true)
  })
  it('el detalle se compara por contenido', () => {
    const doc = { type: 'doc' as const, content: [] }
    expect(
      hayCambiosEnSeguimiento(
        { ...inicial, detalle: { ...doc } } as ValoresDelSeguimiento,
        { ...inicial, detalle: { ...doc } } as ValoresDelSeguimiento,
      ),
    ).toBe(false)
  })
})

describe('seguimientoConVersionNueva', () => {
  it('lo no tocado toma la versión nueva; lo escrito se queda', () => {
    const antes = valoresDelSeguimiento(uno(), TIPOS, ZONA)
    const ahora = valoresDelSeguimiento(
      uno({ titulo: 'Cambiado en otra ventana', visibilidad: 'privado' }),
      TIPOS,
      ZONA,
    )
    const escrito = { ...antes, visible: false, tipoId: 't1' }
    expect(seguimientoConVersionNueva(escrito, antes, ahora)).toEqual({
      ...ahora,
      visible: false,
      tipoId: 't1',
    })
  })
})

describe('claveDelBorradorDeSeguimiento', () => {
  it('una por lead al anotar y una por seguimiento al editar', () => {
    expect(claveDelBorradorDeSeguimiento('l1', null)).toBe('seguimiento-nuevo-l1')
    expect(claveDelBorradorDeSeguimiento('l1', uno())).toBe('seguimiento-s1')
  })
})
