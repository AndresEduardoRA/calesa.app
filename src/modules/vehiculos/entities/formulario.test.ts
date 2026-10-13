import { describe, expect, it } from 'vitest'
import type { CampoDeVehiculo, TipoDeCampo } from './campo'
import { camposComunes } from './comunes'
import { claveDeAtributo, vacioDe, valoresIniciales } from './formulario'
import type { Vehiculo } from './vehiculo'

function campo(
  clave: string,
  tipo: TipoDeCampo,
  extra: Partial<CampoDeVehiculo> = {},
): CampoDeVehiculo {
  return {
    clave,
    etiqueta: clave,
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

const VEHICULO: Vehiculo = {
  id: '00000000-0000-0000-0000-000000000001',
  numero: 12,
  origenId: '00000000-0000-0000-0000-0000000000aa',
  titulo: '2021 Toyota RAV4',
  marca: 'Toyota',
  modelo: null,
  anio: 2021,
  vin: null,
  lote: null,
  plataforma: null,
  urlOrigen: null,
  precio: 24500.5,
  precioNegociable: false,
  aceptaPermuta: null,
  placado: true,
  kilometraje: 42000,
  categoriaId: 'c1',
  faseId: null,
  atributos: {
    color: 'Gris',
    cilindros: 4,
    llave: false,
    extras: ['techo'],
    subasta: '2026-10-13T18:30:00.000Z',
  },
  leadId: null,
  publicadoWeb: false,
  destacadoWeb: false,
  precioWeb: null,
  precioWebHasta: null,
  precioWebNota: null,
  portadaRuta: null,
  creadoPor: null,
  creadoEn: '2026-10-13T12:00:00+00:00',
  actualizadoEn: '2026-10-13T12:00:00+00:00',
}

describe('valoresIniciales', () => {
  const comunes = camposComunes('manual')

  it('un alta arranca vacía, salvo el valor por defecto de cada campo', () => {
    const valores = valoresIniciales({
      comunes,
      campos: [
        campo('color', 'texto', { valorDefecto: 'Blanco' }),
        campo('cilindros', 'numero', { valorDefecto: 4 }),
        campo('llave', 'booleano', { valorDefecto: true }),
        campo('extras', 'multi_opcion', { valorDefecto: ['techo'] }),
        campo('motor', 'texto'),
        campo('placas', 'booleano'),
        campo('paquetes', 'multi_opcion'),
      ],
      vehiculo: null,
    })
    expect(valores).toMatchObject({
      titulo: '',
      anio: '',
      placado: null,
      'a.color': 'Blanco',
      'a.cilindros': '4',
      'a.llave': true,
      'a.extras': ['techo'],
      'a.motor': '',
      'a.placas': null,
      'a.paquetes': [],
    })
  })

  it('una edición arranca con lo guardado, como lo muestra el formulario', () => {
    const valores = valoresIniciales({
      comunes,
      campos: [
        campo('color', 'texto', { valorDefecto: 'Blanco' }),
        campo('cilindros', 'numero'),
        campo('llave', 'booleano'),
        campo('extras', 'multi_opcion'),
        campo('subasta', 'fecha_hora'),
        campo('motor', 'texto', { valorDefecto: 'V6' }),
      ],
      vehiculo: VEHICULO,
      zona: 'America/La_Paz',
    })
    expect(valores).toMatchObject({
      titulo: '2021 Toyota RAV4',
      marca: 'Toyota',
      modelo: '',
      anio: '2021',
      precio: '24500.5',
      placado: true,
      precioNegociable: false,
      aceptaPermuta: null,
      categoriaId: 'c1',
      'a.color': 'Gris',
      'a.cilindros': '4',
      'a.llave': false,
      'a.extras': ['techo'],
      // El instante guardado, en la hora de la empresa.
      'a.subasta': '2026-10-13T14:30',
      // Al editar, un campo sin dato queda vacío: el valor por defecto es sólo del alta.
      'a.motor': '',
    })
  })
})

describe('claves y vacíos', () => {
  it('los campos del layout llevan prefijo y cada forma tiene su vacío', () => {
    expect(claveDeAtributo('color')).toBe('a.color')
    expect(vacioDe({ tipo: 'texto' })).toBe('')
    expect(vacioDe({ tipo: 'booleano' })).toBeNull()
    expect(vacioDe({ tipo: 'multi_opcion' })).toEqual([])
  })
})
