import { describe, expect, it } from 'vitest'
import { Constants } from '@/shared/types/database.types'
import {
  ETIQUETA_DE_TIPO_DE_CAMPO,
  TIPOS_DE_CAMPO,
  TIPOS_DE_LEAD,
  TIPOS_DE_VEHICULO,
  tieneOpciones,
  tipoEntre,
} from './tipos'

describe('tieneOpciones', () => {
  it('sólo los campos de opciones', () => {
    expect(tieneOpciones('opcion')).toBe(true)
    expect(tieneOpciones('multi_opcion')).toBe(true)
    expect(tieneOpciones('texto')).toBe(false)
  })
})

describe('TIPOS_DE_CAMPO', () => {
  it('cada tipo tiene su etiqueta y no se repite', () => {
    expect(new Set(TIPOS_DE_CAMPO).size).toBe(TIPOS_DE_CAMPO.length)
    for (const tipo of TIPOS_DE_CAMPO) {
      expect(ETIQUETA_DE_TIPO_DE_CAMPO[tipo].length).toBeGreaterThan(0)
    }
  })
})

describe('los tipos contra la base', () => {
  it('el motor conoce exactamente los del enum tipo_campo', () => {
    expect([...TIPOS_DE_CAMPO].sort()).toEqual([...Constants.public.Enums.tipo_campo].sort())
  })

  it('un vehículo lleva VIN y lote y no correo ni documento; un lead al revés', () => {
    expect(TIPOS_DE_VEHICULO).toContain('vin')
    expect(TIPOS_DE_VEHICULO).toContain('lote')
    expect(TIPOS_DE_VEHICULO).not.toContain('correo')
    expect(TIPOS_DE_VEHICULO).not.toContain('documento')
    expect(TIPOS_DE_LEAD).toContain('correo')
    expect(TIPOS_DE_LEAD).toContain('documento')
    expect(TIPOS_DE_LEAD).not.toContain('vin')
    expect(TIPOS_DE_LEAD).not.toContain('lote')
  })

  it('todo tipo de un layout es un tipo del motor', () => {
    for (const tipo of [...TIPOS_DE_VEHICULO, ...TIPOS_DE_LEAD]) {
      expect(TIPOS_DE_CAMPO).toContain(tipo)
    }
  })
})

describe('tipoEntre', () => {
  it('devuelve el tipo si el layout lo ofrece y, si no, el de respaldo', () => {
    expect(tipoEntre(TIPOS_DE_LEAD, 'correo', 'texto')).toBe('correo')
    expect(tipoEntre(TIPOS_DE_LEAD, 'vin', 'texto')).toBe('texto')
    expect(tipoEntre(TIPOS_DE_VEHICULO, 'documento', 'texto')).toBe('texto')
  })
})
