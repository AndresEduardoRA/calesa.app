import { describe, expect, it } from 'vitest'
import { camposActivos, camposDeTarjeta, type CampoDeVehiculo } from './campo'

function campo(clave: string, extra: Partial<CampoDeVehiculo> = {}): CampoDeVehiculo {
  return {
    clave,
    etiqueta: clave,
    tipo: 'texto',
    opciones: [],
    requerido: false,
    grupo: null,
    enTarjeta: false,
    filtrable: false,
    activo: true,
    valorDefecto: null,
    ...extra,
  }
}

const CAMPOS = [
  campo('color', { enTarjeta: true }),
  campo('motor'),
  campo('viejo', { enTarjeta: true, activo: false }),
  campo('condicion', { enTarjeta: true }),
]

describe('campos del layout', () => {
  it('los desactivados no forman parte de la ficha', () => {
    expect(camposActivos(CAMPOS).map((uno) => uno.clave)).toEqual(['color', 'motor', 'condicion'])
  })

  it('las columnas del listado son los «en tarjeta» activos, en el orden del layout', () => {
    expect(camposDeTarjeta(CAMPOS).map((uno) => uno.clave)).toEqual(['color', 'condicion'])
  })
})
