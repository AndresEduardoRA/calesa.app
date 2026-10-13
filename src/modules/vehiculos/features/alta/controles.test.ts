import { describe, expect, it } from 'vitest'
import type { CampoDeVehiculo, TipoDeCampo } from '../../entities/campo'
import { camposComunes } from '../../entities/comunes'
import { campoDeAtributo, camposDeComunes } from './controles'

function campo(tipo: TipoDeCampo, extra: Partial<CampoDeVehiculo> = {}): CampoDeVehiculo {
  return {
    clave: 'dato',
    etiqueta: 'Dato',
    tipo,
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

const OPCIONES = [{ clave: 'manual', etiqueta: 'Manual' }]

describe('campoDeAtributo', () => {
  it('lleva la etiqueta del layout y la clave con prefijo', () => {
    expect(
      campoDeAtributo(campo('texto', { etiqueta: 'Color', clave: 'color', requerido: true }), null),
    ).toEqual({
      clave: 'a.color',
      etiqueta: 'Color',
      requerido: true,
      control: { tipo: 'texto', largo: 500 },
    })
  })

  it('cada tipo tiene su control', () => {
    const tipoDe = (tipo: TipoDeCampo) => campoDeAtributo(campo(tipo), null).control.tipo
    expect(tipoDe('texto_largo')).toBe('texto_largo')
    expect(tipoDe('numero')).toBe('numero')
    expect(tipoDe('moneda')).toBe('numero')
    expect(tipoDe('booleano')).toBe('si_no')
    expect(tipoDe('fecha')).toBe('fecha')
    expect(tipoDe('fecha_hora')).toBe('fecha_hora')
    expect(tipoDe('multi_opcion')).toBe('varias')
    expect(campoDeAtributo(campo('url'), null).control).toMatchObject({ modo: 'url' })
    expect(campoDeAtributo(campo('vin'), null).control).toMatchObject({ mayusculas: true })
  })

  it('una opción guardada que ya se sacó del campo se sigue ofreciendo, marcada', () => {
    const control = campoDeAtributo(campo('opcion', { opciones: OPCIONES }), 'cvt').control
    expect(control).toEqual({
      tipo: 'opcion',
      opciones: [
        { valor: 'manual', etiqueta: 'Manual' },
        { valor: 'cvt', etiqueta: 'cvt (ya no se ofrece)' },
      ],
    })
    const varias = campoDeAtributo(campo('multi_opcion', { opciones: OPCIONES }), [
      'manual',
      'techo',
    ])
    expect(varias.control).toMatchObject({
      opciones: [{ valor: 'manual' }, { valor: 'techo', etiqueta: 'techo (ya no se ofrece)' }],
    })
  })
})

describe('camposDeComunes', () => {
  const CATEGORIAS = [
    { id: 'c1', nombre: 'SUV', activa: true },
    { id: 'c2', nombre: 'Vieja', activa: false },
  ]

  it('ofrece las categorías activas, más la que el vehículo ya tiene', () => {
    const opciones = (actual: string | null) => {
      const categoria = camposDeComunes(camposComunes('manual'), CATEGORIAS, actual).find(
        (uno) => uno.clave === 'categoriaId',
      )
      return categoria?.control.tipo === 'opcion' ? categoria.control.opciones : []
    }
    expect(opciones(null)).toEqual([{ valor: 'c1', etiqueta: 'SUV' }])
    expect(opciones('c2').map((opcion) => opcion.valor)).toEqual(['c1', 'c2'])
  })

  it('el título es el único requerido y el kilometraje lleva su unidad', () => {
    const campos = camposDeComunes(camposComunes('subasta'), [], null)
    expect(campos.filter((uno) => uno.requerido).map((uno) => uno.clave)).toEqual(['titulo'])
    expect(campos.find((uno) => uno.clave === 'kilometraje')?.control).toEqual({
      tipo: 'numero',
      entero: true,
      unidad: 'km',
    })
    expect(campos.find((uno) => uno.clave === 'precio')?.bloque).toBe('precio')
  })
})
