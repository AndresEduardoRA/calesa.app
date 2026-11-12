import { describe, expect, it } from 'vitest'
import {
  validarDocumento,
  type BorradorDeDocumento,
  BORRADOR_DE_DOCUMENTO_NUEVO,
} from './formulario-de-documento'
import type { TipoParaRequisito } from './opciones'

const LOCALE = 'es-BO'
const tipos: TipoParaRequisito[] = [
  { id: 't1', nombre: 'Título', formatos: ['application/pdf', 'image/jpeg'], activo: true },
  { id: 't2', nombre: 'Viejo', formatos: ['application/pdf'], activo: false },
]
const borrador = (parcial: Partial<BorradorDeDocumento>): BorradorDeDocumento => ({
  ...BORRADOR_DE_DOCUMENTO_NUEVO,
  tipoId: 't1',
  ...parcial,
})
const errores = (b: BorradorDeDocumento) => {
  const v = validarDocumento(b, tipos, LOCALE)
  return v.ok ? null : v.errores
}

describe('validarDocumento', () => {
  it('sólo con el tipo manda sólo el tipo (formatos «los del tipo»)', () => {
    expect(validarDocumento(borrador({}), tipos, LOCALE)).toEqual({
      ok: true,
      datos: { tipo_documento_id: 't1' },
    })
  })

  it('manda mínimo, máximo, formatos marcados y notas', () => {
    expect(
      validarDocumento(
        borrador({ minimo: '1', maximo: '3', formatos: ['application/pdf'], notas: ' ojo ' }),
        tipos,
        LOCALE,
      ),
    ).toEqual({
      ok: true,
      datos: {
        tipo_documento_id: 't1',
        min_archivos: 1,
        max_archivos: 3,
        formatos: ['application/pdf'],
        notas: 'ojo',
      },
    })
  })

  it('pide el tipo y rechaza uno inactivo o que no está', () => {
    expect(errores(borrador({ tipoId: '' }))).toMatchObject({
      tipo_documento_id: 'Elige un tipo de documento.',
    })
    expect(errores(borrador({ tipoId: 't2' }))?.tipo_documento_id).toBeDefined()
    expect(errores(borrador({ tipoId: 'zz' }))?.tipo_documento_id).toBeDefined()
  })

  it('el mínimo y el máximo son enteros de 1 en adelante', () => {
    expect(errores(borrador({ minimo: '0' }))?.min_archivos).toBe('Pide al menos 1 archivo.')
    expect(errores(borrador({ maximo: '0' }))?.max_archivos).toBe('Pide al menos 1 archivo.')
    expect(errores(borrador({ minimo: '1,5' }))?.min_archivos).toBe('Escribe un número entero.')
    expect(errores(borrador({ minimo: 'abc' }))?.min_archivos).toBe('Escribe un número entero.')
  })

  it('el máximo no baja del mínimo', () => {
    expect(errores(borrador({ minimo: '3', maximo: '2' }))?.max_archivos).toBe(
      'El máximo de archivos no puede ser menor que el mínimo.',
    )
    expect(errores(borrador({ minimo: '2', maximo: '2' }))).toBeNull()
  })

  it('un formato fuera de los del tipo se rechaza', () => {
    expect(errores(borrador({ formatos: ['image/png'] }))?.formatos).toBe(
      'Los formatos deben estar entre los del tipo.',
    )
  })

  it('las notas largas se rechazan', () => {
    expect(errores(borrador({ notas: 'a'.repeat(501) }))?.notas).toBeDefined()
  })
})
