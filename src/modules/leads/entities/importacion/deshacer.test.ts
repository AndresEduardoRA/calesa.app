import { describe, expect, it } from 'vitest'
import {
  MOTIVOS_PARA_QUEDARSE,
  TEXTO_DEL_MOTIVO,
  deshacerDesde,
  filasDichas,
  recientesDesde,
  sePuedeDeshacer,
  textoDeConfirmacion,
  tiempoQueQueda,
  titularDelDeshacer,
  type ImportacionReciente,
} from './deshacer'

const numero = (n: number) => String(n)
const ID = '0b1c2d3e-0000-0000-0000-000000000001'

const reciente = (cambios: Partial<ImportacionReciente> = {}): ImportacionReciente => ({
  id: ID,
  fecha: '2026-10-17T10:00:00.000Z',
  venceEn: '2026-10-18T10:00:00.000Z',
  estado: 'terminada',
  creadas: 10,
  yaExistian: 2,
  rechazadas: 1,
  intactos: 10,
  resultado: null,
  ...cambios,
})

describe('deshacerDesde', () => {
  it('lee la respuesta de la base', () => {
    const dato = {
      importacion: ID,
      movidos: 3,
      quedaron: [{ motivo: 'editado', cantidad: 1, filas: [2] }],
      purgados: 0,
      repetido: false,
    }
    expect(deshacerDesde(dato)).toEqual({
      movidos: 3,
      quedaron: [{ motivo: 'editado', cantidad: 1, filas: [2] }],
      purgados: 0,
      repetido: false,
    })
  })

  it('rechaza un motivo que no conoce o una forma rota', () => {
    expect(
      deshacerDesde({
        movidos: 1,
        quedaron: [{ motivo: 'x', cantidad: 1, filas: [] }],
        purgados: 0,
        repetido: false,
      }),
    ).toBeNull()
    expect(deshacerDesde({ movidos: '3' })).toBeNull()
  })
})

describe('recientesDesde', () => {
  it('pasa las fechas a ISO y los nombres a los del código', () => {
    const [primera] =
      recientesDesde([
        {
          id: ID,
          fecha: '2026-10-17T06:00:00-04:00',
          vence_en: '2026-10-18T06:00:00-04:00',
          estado: 'abierta',
          creadas: 4,
          ya_existian: null,
          rechazadas: null,
          intactos: 4,
          deshecha_en: null,
          resultado: null,
        },
      ]) ?? []
    expect(primera).toEqual(
      reciente({
        estado: 'abierta',
        creadas: 4,
        yaExistian: null,
        rechazadas: null,
        intactos: 4,
      }),
    )
  })

  it('rechaza lo que no es una lista de importaciones', () => {
    expect(recientesDesde({ id: ID })).toBeNull()
    expect(recientesDesde([{ id: 'no-es-un-id' }])).toBeNull()
  })
})

describe('tiempoQueQueda', () => {
  const vence = '2026-10-18T10:00:00.000Z'
  it('en horas, en minutos en la última hora, y nulo al vencer', () => {
    expect(tiempoQueQueda(vence, new Date('2026-10-17T10:00:00.000Z'))).toBe('24 h')
    expect(tiempoQueQueda(vence, new Date('2026-10-17T10:30:00.000Z'))).toBe('23 h')
    expect(tiempoQueQueda(vence, new Date('2026-10-18T09:15:00.000Z'))).toBe('45 min')
    expect(tiempoQueQueda(vence, new Date('2026-10-18T09:59:30.000Z'))).toBe('1 min')
    expect(tiempoQueQueda(vence, new Date('2026-10-18T10:00:00.000Z'))).toBeNull()
    expect(tiempoQueQueda(vence, new Date('2026-10-18T10:00:01.000Z'))).toBeNull()
  })
})

describe('sePuedeDeshacer', () => {
  const ahora = new Date('2026-10-17T12:00:00.000Z')
  it('en plazo y con algo intacto', () => {
    expect(sePuedeDeshacer(reciente(), ahora)).toBe(true)
  })
  it('no si ya se deshizo, si nada sigue intacto o si venció', () => {
    expect(sePuedeDeshacer(reciente({ estado: 'deshecha', intactos: null }), ahora)).toBe(false)
    expect(sePuedeDeshacer(reciente({ intactos: 0 }), ahora)).toBe(false)
    expect(sePuedeDeshacer(reciente(), new Date('2026-10-18T10:00:00.000Z'))).toBe(false)
  })
})

describe('textoDeConfirmacion', () => {
  it('dice cuántos se moverán y cuántos se quedan', () => {
    expect(textoDeConfirmacion(10, 10, numero)).toBe(
      'Se moverán 10 leads a la papelera, donde puedes restaurarlos.',
    )
    expect(textoDeConfirmacion(1, 1, numero)).toBe(
      'Se moverá 1 lead a la papelera, donde puedes restaurarlos.',
    )
    expect(textoDeConfirmacion(7, 10, numero)).toBe(
      'Se moverán 7 leads a la papelera, donde puedes restaurarlos. Los otros 3 ya cambiaron y se quedan.',
    )
    expect(textoDeConfirmacion(9, 10, numero)).toBe(
      'Se moverán 9 leads a la papelera, donde puedes restaurarlos. El otro ya cambió y se queda.',
    )
  })
})

describe('filasDichas', () => {
  it('una, varias y muchas', () => {
    expect(filasDichas([2], numero)).toBe('fila 2')
    expect(filasDichas([2, 5], numero)).toBe('filas 2 y 5')
    expect(filasDichas([2, 5, 9], numero)).toBe('filas 2, 5 y 9')
    expect(filasDichas([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], numero)).toBe(
      'filas 2, 3, 4, 5, 6, 7, 8, 9 y 2 más',
    )
  })
})

describe('titularDelDeshacer', () => {
  it('cuántos se movieron y cuántos se quedaron', () => {
    expect(titularDelDeshacer({ movidos: 3, quedaron: [] }, numero)).toBe(
      'Se movieron 3 leads a la papelera.',
    )
    expect(
      titularDelDeshacer(
        {
          movidos: 1,
          quedaron: [
            { motivo: 'editado', cantidad: 1, filas: [2] },
            { motivo: 'portal', cantidad: 1, filas: [4] },
          ],
        },
        numero,
      ),
    ).toBe('Se movió 1 lead a la papelera. 2 se quedaron en tu cartera.')
    expect(
      titularDelDeshacer(
        { movidos: 0, quedaron: [{ motivo: 'editado', cantidad: 1, filas: [2] }] },
        numero,
      ),
    ).toBe('No se movió ningún lead: todos ya cambiaron.')
    expect(titularDelDeshacer({ movidos: 0, quedaron: [] }, numero)).toBe(
      'No había leads para mover a la papelera.',
    )
  })
})

describe('TEXTO_DEL_MOTIVO', () => {
  it('tiene un texto por cada motivo de la base', () => {
    for (const motivo of MOTIVOS_PARA_QUEDARSE) {
      expect(TEXTO_DEL_MOTIVO[motivo]).toMatch(/^Ya /)
    }
  })
})
