import { describe, expect, it } from 'vitest'
import {
  borradorParaGuardar,
  claveDelBorradorDeTabla,
  recuperarBorrador,
  type BorradorDeTabla,
} from './borrador-de-tabla'

const BORRADOR: BorradorDeTabla = {
  version: 3,
  filas: [
    { id: 'b', valores: { anio: 2019, factor: 1.5 } },
    { id: 'a', valores: { anio: 2018 } },
  ],
  crudos: { a: { factor: { texto: '1.5', mensaje: 'Usa coma para los decimales: 1,5.' } } },
}

describe('el borrador de una tabla', () => {
  it('va por tabla', () => {
    expect(claveDelBorradorDeTabla('t1')).toBe('tabla-de-referencia:t1')
  })

  it('se repone con la misma versión: ids, orden y crudos', () => {
    expect(recuperarBorrador(borradorParaGuardar(BORRADOR), 3)).toEqual({
      tipo: 'misma',
      filas: BORRADOR.filas,
      crudos: BORRADOR.crudos,
    })
  })

  it('de otra versión es viejo', () => {
    expect(recuperarBorrador(borradorParaGuardar(BORRADOR), 4)).toEqual({ tipo: 'vieja' })
  })

  it('roto, de otra forma o ausente es lo mismo que no tener', () => {
    expect(recuperarBorrador(null, 3)).toBeNull()
    expect(recuperarBorrador({ tabla: '{roto' }, 3)).toBeNull()
    expect(recuperarBorrador({ tabla: JSON.stringify({ version: 3, filas: 'no' }) }, 3)).toBeNull()
    expect(recuperarBorrador({ otra: 'x' }, 3)).toBeNull()
  })
})
