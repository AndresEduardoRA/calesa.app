import { describe, expect, it } from 'vitest'
import type { CampoDeVehiculo, TipoDeCampo } from './campo'
import { valorMostrado } from './valor'

function campo(tipo: TipoDeCampo, extra: Partial<CampoDeVehiculo> = {}): CampoDeVehiculo {
  return {
    clave: 'dato',
    etiqueta: 'Dato',
    tipo,
    opciones: [],
    requerido: false,
    grupo: null,
    enTarjeta: true,
    filtrable: false,
    activo: true,
    valorDefecto: null,
    ...extra,
  }
}

const FORMATO = { locale: 'es-BO', zona: 'America/La_Paz' }
const OPCIONES = [
  { clave: 'automatica', etiqueta: 'Automática' },
  { clave: 'manual', etiqueta: 'Manual' },
]

describe('valorMostrado', () => {
  it('lo que no tiene valor es vacío, sea del tipo que sea', () => {
    for (const valor of [undefined, null, '', []]) {
      expect(valorMostrado(campo('texto'), valor)).toEqual({ tipo: 'vacio' })
    }
    expect(valorMostrado(campo('numero'), 'cuatro')).toEqual({ tipo: 'vacio' })
  })

  it('un cero y un «no» son valores', () => {
    expect(valorMostrado(campo('numero'), 0, FORMATO)).toEqual({ tipo: 'texto', texto: '0' })
    expect(valorMostrado(campo('booleano'), false)).toEqual({ tipo: 'texto', texto: 'No' })
    expect(valorMostrado(campo('booleano'), true)).toEqual({ tipo: 'texto', texto: 'Sí' })
  })

  it('un número va con el formato de la empresa y un monto queda para <Monto>', () => {
    expect(valorMostrado(campo('numero'), 123456.5, FORMATO)).toEqual({
      tipo: 'texto',
      texto: '123.456,5',
    })
    expect(valorMostrado(campo('moneda'), 9800)).toEqual({ tipo: 'monto', valor: 9800 })
  })

  it('una opción muestra su etiqueta, y una que ya se sacó, su clave', () => {
    const transmision = campo('opcion', { opciones: OPCIONES })
    expect(valorMostrado(transmision, 'automatica')).toEqual({ tipo: 'texto', texto: 'Automática' })
    expect(valorMostrado(transmision, 'cvt')).toEqual({ tipo: 'texto', texto: 'cvt' })
    expect(valorMostrado(campo('multi_opcion', { opciones: OPCIONES }), ['manual', 'cvt'])).toEqual(
      {
        tipo: 'texto',
        texto: 'Manual, cvt',
      },
    )
  })

  it('las fechas van en la zona de la empresa; una ilegible se muestra como vino', () => {
    expect(valorMostrado(campo('fecha'), '2026-10-13', FORMATO)).toEqual({
      tipo: 'texto',
      texto: '13 oct 2026',
    })
    expect(valorMostrado(campo('fecha_hora'), '2026-10-13T18:30:00.000Z', FORMATO)).toEqual({
      tipo: 'texto',
      texto: '13 oct 2026, 14:30',
    })
    expect(valorMostrado(campo('fecha'), 'mañana')).toEqual({ tipo: 'texto', texto: 'mañana' })
  })

  it('sólo se enlaza una dirección web', () => {
    expect(valorMostrado(campo('url'), 'https://copart.com/lot/1')).toEqual({
      tipo: 'enlace',
      url: 'https://copart.com/lot/1',
    })
    expect(valorMostrado(campo('url'), 'javascript:alert(1)')).toEqual({
      tipo: 'texto',
      texto: 'javascript:alert(1)',
    })
  })

  it('el texto, el VIN y el lote salen tal cual', () => {
    expect(valorMostrado(campo('vin'), 'JTMW1RFV8MD012345')).toEqual({
      tipo: 'texto',
      texto: 'JTMW1RFV8MD012345',
    })
    expect(valorMostrado(campo('lote'), 58741223)).toEqual({ tipo: 'texto', texto: '58741223' })
  })
})
