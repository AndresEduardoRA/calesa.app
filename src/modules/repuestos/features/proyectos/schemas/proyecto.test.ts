import { describe, expect, it } from 'vitest'
import { esquemaCrearProyecto } from './proyecto'

const ID = '00000000-0000-4000-8000-000000000002'
const VEHICULO = '00000000-0000-4000-8000-000000000001'

function campoConError(entrada: unknown): string | null {
  const r = esquemaCrearProyecto.safeParse(entrada)
  return r.success ? null : String(r.error.issues[0]?.path[0])
}

describe('esquemaCrearProyecto', () => {
  it('acepta un vehículo solo', () => {
    expect(esquemaCrearProyecto.safeParse({ id: ID, vehiculoId: VEHICULO }).success).toBe(true)
  })

  it('acepta un externo con etiqueta', () => {
    expect(esquemaCrearProyecto.safeParse({ id: ID, vehiculoEtiqueta: 'Camión' }).success).toBe(
      true,
    )
  })

  it('sin vehículo ni etiqueta falla en la etiqueta', () => {
    expect(campoConError({ id: ID })).toBe('vehiculoEtiqueta')
  })

  it('un vehículo con etiqueta, o con VIN, falla en la etiqueta', () => {
    expect(campoConError({ id: ID, vehiculoId: VEHICULO, vehiculoEtiqueta: 'x' })).toBe(
      'vehiculoEtiqueta',
    )
    expect(campoConError({ id: ID, vehiculoId: VEHICULO, vin: 'x' })).toBe('vehiculoEtiqueta')
  })

  it('un campo vacío no es un valor: o no va o falla', () => {
    expect(campoConError({ id: ID, vehiculoEtiqueta: '   ' })).toBe('vehiculoEtiqueta')
  })

  it('el id tiene que ser un guid', () => {
    expect(campoConError({ id: 'x', vehiculoEtiqueta: 'Camión' })).toBe('id')
  })
})
