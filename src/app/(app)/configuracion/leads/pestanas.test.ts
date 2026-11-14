import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { alMenosUna } from '../empresa/pestanas'
import { CLAVES_DE_PESTANA, PERMISOS_DE_LEADS, pestanaDe, pestanasPara } from './pestanas'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))

const MOTIVO_CAMPOS = 'Te falta el permiso «Gestionar los campos de los leads».'
const MOTIVO_LEADS = 'Te falta el permiso «Configurar leads».'

describe('las pestañas', () => {
  it('los tipos de seguimiento siguen a los tipos de lead; después, las dos plantillas', () => {
    expect([...CLAVES_DE_PESTANA]).toEqual([
      'campos',
      'origenes',
      'tipos',
      'seguimientos',
      'embudo',
      'portal',
      'telefonos',
    ])
  })

  it('se entra con cualquiera de los dos permisos', () => {
    expect([...PERMISOS_DE_LEADS]).toEqual(['leads.campos.gestionar', 'leads.configurar'])
  })
})

describe('pestanasPara', () => {
  it('con las dos claves, ninguna apagada', () => {
    const pestanas = pestanasPara(con('leads.configurar', 'leads.campos.gestionar'))
    expect(pestanas.map((pestana) => pestana.motivo)).toEqual(pestanas.map(() => undefined))
    expect(pestanas).toHaveLength(7)
  })

  it('con sólo leads.configurar, «Campos» se ve apagada con su motivo y las otras abiertas', () => {
    const pestanas = pestanasPara(con('leads.configurar'))
    expect(pestanas.map((pestana) => [pestana.clave, pestana.motivo])).toEqual([
      ['campos', MOTIVO_CAMPOS],
      ['origenes', undefined],
      ['tipos', undefined],
      ['seguimientos', undefined],
      ['embudo', undefined],
      ['portal', undefined],
      ['telefonos', undefined],
    ])
  })

  it('con sólo leads.campos.gestionar, al revés', () => {
    const pestanas = pestanasPara(con('leads.campos.gestionar'))
    expect(pestanas.map((pestana) => [pestana.clave, pestana.motivo])).toEqual([
      ['campos', undefined],
      ['origenes', MOTIVO_LEADS],
      ['tipos', MOTIVO_LEADS],
      ['seguimientos', MOTIVO_LEADS],
      ['embudo', MOTIVO_LEADS],
      ['portal', MOTIVO_LEADS],
      ['telefonos', MOTIVO_LEADS],
    ])
  })
})

describe('pestanaDe', () => {
  const todas = alMenosUna(
    pestanasPara(con('leads.configurar', 'leads.campos.gestionar')).filter((p) => !p.motivo),
  )
  const sinCampos = alMenosUna(pestanasPara(con('leads.configurar')).filter((p) => !p.motivo))

  it('abre la que dice la URL', () => {
    if (!todas) throw new Error('sin pestañas')
    for (const clave of CLAVES_DE_PESTANA) {
      expect(pestanaDe(clave, todas)).toBe(clave)
    }
  })

  it('lo que no es una pestaña abre la primera habilitada', () => {
    if (!todas) throw new Error('sin pestañas')
    expect(pestanaDe(undefined, todas)).toBe('campos')
    expect(pestanaDe('<script>', todas)).toBe('campos')
    expect(pestanaDe('', todas)).toBe('campos')
  })

  it('una pestaña apagada en la URL abre la primera habilitada', () => {
    if (!sinCampos) throw new Error('sin pestañas')
    expect(pestanaDe('campos', sinCampos)).toBe('origenes')
    expect(pestanaDe(undefined, sinCampos)).toBe('origenes')
    expect(pestanaDe('tipos', sinCampos)).toBe('tipos')
  })
})
