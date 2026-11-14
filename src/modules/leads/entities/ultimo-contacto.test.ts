import { describe, expect, it } from 'vitest'
import {
  recordatorioDeFilaDesde,
  rutaDelRecordatorioDeFila,
  rutaDelSeguimientoDeFila,
  seguimientoDeFilaDesde,
  textoDelRecordatorio,
  textoDelUltimoSeguimiento,
  tipoDeSeguimientoDelCatalogo,
} from './ultimo-contacto'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const TIPO = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'
const ZONA = 'America/La_Paz'
// 12:00 en La Paz del 14 de noviembre.
const AHORA = new Date('2026-11-14T16:00:00Z')
const contexto = { ahora: AHORA, zona: ZONA }
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString()
const HORA = 3_600_000
const DIA = 24 * HORA

describe('textoDelUltimoSeguimiento', () => {
  it('dice «hace 3 días», «hace 2 horas» y «hace 1 día» con el calendario de la empresa', () => {
    expect(textoDelUltimoSeguimiento(hace(3 * DIA), contexto)).toBe('hace 3 días')
    expect(textoDelUltimoSeguimiento(hace(2 * HORA), contexto)).toBe('hace 2 horas')
    expect(textoDelUltimoSeguimiento(hace(DIA), contexto)).toBe('hace 1 día')
  })

  it('pasada una semana, la fecha', () => {
    expect(textoDelUltimoSeguimiento(hace(20 * DIA), contexto)).toMatch(/\d/)
    expect(textoDelUltimoSeguimiento(hace(20 * DIA), contexto)).not.toMatch(/hace/)
  })

  it('se refresca con el reloj: el mismo instante, más tarde, dice otra cosa', () => {
    const en = hace(2 * HORA)
    const mas = { ahora: new Date(AHORA.getTime() + 2 * HORA), zona: ZONA }
    expect(textoDelUltimoSeguimiento(en, mas)).toBe('hace 4 horas')
  })
})

describe('textoDelRecordatorio', () => {
  it('uno futuro dice «en 2 días» y no está vencido', () => {
    const r = textoDelRecordatorio(new Date(AHORA.getTime() + 2 * DIA).toISOString(), contexto)
    expect(r).toEqual({ texto: 'en 2 días', vencido: false })
  })

  it('uno futuro de hoy dice las horas', () => {
    const r = textoDelRecordatorio(new Date(AHORA.getTime() + 3 * HORA).toISOString(), contexto)
    expect(r).toEqual({ texto: 'en 3 horas', vencido: false })
  })

  it('uno pasado está vencido y lo dice con texto', () => {
    expect(textoDelRecordatorio(hace(2 * DIA), contexto)).toEqual({
      texto: 'vencido hace 2 días',
      vencido: true,
    })
    expect(textoDelRecordatorio(hace(HORA), contexto)).toEqual({
      texto: 'vencido hace 1 hora',
      vencido: true,
    })
  })

  it('uno de hoy que ya pasó dice las horas, y uno de mañana dice «en 1 día»', () => {
    expect(
      textoDelRecordatorio(new Date(AHORA.getTime() + DIA).toISOString(), contexto).texto,
    ).toBe('en 1 día')
  })

  it('el de este mismo instante ya venció', () => {
    expect(textoDelRecordatorio(AHORA.toISOString(), contexto).vencido).toBe(true)
  })
})

describe('lo que llega de la vista', () => {
  it('lee el último seguimiento y el recordatorio; una forma rota o nula es nula', () => {
    expect(seguimientoDeFilaDesde({ tipo_id: TIPO, titulo: 'Llamada' })).toEqual({
      tipoId: TIPO,
      titulo: 'Llamada',
    })
    expect(seguimientoDeFilaDesde(null)).toBeNull()
    expect(seguimientoDeFilaDesde({ titulo: 'x' })).toBeNull()
    expect(recordatorioDeFilaDesde({ id: ID, titulo: 'Llamar', recordar_en: hace(HORA) })).toEqual({
      id: ID,
      titulo: 'Llamar',
      recordarEn: hace(HORA),
    })
    expect(recordatorioDeFilaDesde(undefined)).toBeNull()
  })

  it('el tipo se busca en el catálogo, también si está apagado', () => {
    const tipos = [{ id: TIPO, nombre: 'Llamada', icono: 'phone', activo: false }]
    expect(tipoDeSeguimientoDelCatalogo(tipos, TIPO)?.nombre).toBe('Llamada')
    expect(tipoDeSeguimientoDelCatalogo(tipos, ID)).toBeNull()
  })
})

describe('a dónde lleva cada uno', () => {
  it('el seguimiento abre la ficha en sus seguimientos', () => {
    expect(rutaDelSeguimientoDeFila(ID)).toBe(`/leads/${ID}?seccion=seguimientos`)
  })

  it('el recordatorio de un lead en la cartera se abre en la ficha', () => {
    const ruta = rutaDelRecordatorioDeFila(ID, true, TIPO)
    expect(ruta.startsWith(`/leads/${ID}?`)).toBe(true)
    const consulta = new URLSearchParams(ruta.split('?')[1])
    expect(consulta.get('seccion')).toBe('seguimientos')
    expect(consulta.get('panel')).toBe('editar-recordatorio')
    expect(consulta.get('recordatorio')).toBe(TIPO)
  })

  it('el de un lead que ya no está en la cartera se abre en la agenda', () => {
    expect(rutaDelRecordatorioDeFila(ID, false, TIPO)).toBe(`/agenda?recordatorio=${TIPO}`)
  })
})
