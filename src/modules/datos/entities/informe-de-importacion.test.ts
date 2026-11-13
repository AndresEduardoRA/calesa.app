import { describe, expect, it } from 'vitest'
import {
  filasDelInformeDesde,
  motivoDeLaFila,
  tablaDeRechazadas,
  type FilaDelInforme,
} from './informe-de-importacion'

const archivo = {
  encabezados: ['Nombre', 'Teléfono', 'Ciudad'],
  filas: [
    ['Ana', '70000001', 'La Paz'],
    ['Beto', '70000002', 'Oruro'],
    ['Caro', '70000003', 'Sucre'],
    ['Dani', '7x'],
  ],
}
const informe: FilaDelInforme[] = [
  { fila: 2, resultado: 'ya_existe', campo: 'telefono_principal', motivo: null },
  {
    fila: 4,
    resultado: 'error',
    campo: 'telefono_principal',
    motivo: 'Teléfono: no es un número.',
  },
]

describe('tablaDeRechazadas', () => {
  it('con el archivo, cada rechazada lleva sus propias celdas y la fila de la persona', () => {
    expect(tablaDeRechazadas(informe, 'leads', archivo)).toEqual([
      ['Fila', 'Nombre', 'Teléfono', 'Ciudad', 'Resultado', 'Motivo'],
      ['3', 'Beto', '70000002', 'Oruro', 'Ya existe', 'Ya hay un lead con este teléfono.'],
      ['5', 'Dani', '7x', '', 'Con errores', 'Teléfono: no es un número.'],
    ])
  })

  it('sin el archivo, sólo fila, resultado, campo y motivo, sin nombrar a nadie', () => {
    const tabla = tablaDeRechazadas(informe, 'leads', null)
    expect(tabla).toEqual([
      ['Fila', 'Resultado', 'Campo', 'Motivo'],
      ['3', 'Ya existe', 'Teléfono', 'Ya hay un lead con este teléfono.'],
      ['5', 'Con errores', 'Teléfono', 'Teléfono: no es un número.'],
    ])
  })

  it('un vehículo que ya existe lleva el motivo de la base', () => {
    const fila: FilaDelInforme = {
      fila: 1,
      resultado: 'ya_existe',
      campo: null,
      motivo: 'Ya hay un vehículo con ese VIN o ese lote.',
    }
    expect(motivoDeLaFila(fila, 'vehiculos')).toBe('Ya hay un vehículo con ese VIN o ese lote.')
    expect(motivoDeLaFila({ ...fila, motivo: null }, 'vehiculos')).toBe('Ya existe.')
    expect(motivoDeLaFila({ ...fila, resultado: 'error', motivo: null }, 'leads')).toBe(
      'Con errores.',
    )
  })
})

describe('filasDelInformeDesde', () => {
  it('lee lo que da la base y rechaza lo que no promete', () => {
    expect(
      filasDelInformeDesde([{ fila: 2, resultado: 'ya_existe', campo: null, motivo: null }]),
    ).toHaveLength(1)
    expect(
      filasDelInformeDesde([{ fila: 2, resultado: 'otro', campo: null, motivo: null }]),
    ).toBeNull()
  })
})
