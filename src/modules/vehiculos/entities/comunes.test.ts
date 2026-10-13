import { describe, expect, it } from 'vitest'
import { BLOQUES_COMUNES, camposComunes, valorComun, type CampoComun } from './comunes'
import type { Vehiculo } from './vehiculo'

const VEHICULO: Vehiculo = {
  id: '00000000-0000-0000-0000-000000000001',
  numero: 12,
  origenId: '00000000-0000-0000-0000-0000000000aa',
  titulo: '2021 Toyota RAV4',
  marca: 'Toyota',
  modelo: null,
  anio: 2021,
  vin: 'JTMW1RFV8MD012345',
  lote: null,
  plataforma: null,
  urlOrigen: 'https://copart.com/lot/1',
  precio: 24500,
  precioNegociable: false,
  aceptaPermuta: null,
  placado: true,
  kilometraje: 42000,
  categoriaId: 'c1',
  faseId: null,
  atributos: {},
  creadoPor: null,
  creadoEn: '2026-10-13T12:00:00+00:00',
  actualizadoEn: '2026-10-13T12:00:00+00:00',
}
const CONTEXTO = { categorias: [{ id: 'c1', nombre: 'SUV', activa: true }], locale: 'es-BO' }

const campo = (clave: CampoComun['clave']) => {
  const encontrado = camposComunes('subasta').find((uno) => uno.clave === clave)
  if (!encontrado) {
    throw new Error(`sin campo ${clave}`)
  }
  return encontrado
}
const valor = (clave: CampoComun['clave'], vehiculo: Vehiculo = VEHICULO) =>
  valorComun(campo(clave), vehiculo, CONTEXTO)

describe('camposComunes', () => {
  it('el lote, la plataforma y el enlace sólo van en un origen de subasta', () => {
    const deSubasta = camposComunes('subasta').map((uno) => uno.clave)
    const manuales = camposComunes('manual').map((uno) => uno.clave)
    expect(deSubasta).toEqual(expect.arrayContaining(['lote', 'plataforma', 'urlOrigen']))
    expect(manuales).not.toContain('lote')
    expect(manuales).not.toContain('plataforma')
    expect(manuales).not.toContain('urlOrigen')
    expect(manuales[0]).toBe('titulo')
  })

  it('cada uno cae en un bloque que existe, y sólo el título es requerido', () => {
    const bloques = BLOQUES_COMUNES.map((bloque) => bloque.clave)
    for (const uno of camposComunes('subasta')) {
      expect(bloques).toContain(uno.bloque)
    }
    expect(
      camposComunes('subasta')
        .filter((uno) => uno.requerido)
        .map((uno) => uno.clave),
    ).toEqual(['titulo'])
  })
})

describe('valorComun', () => {
  it('lo que no tiene dato es vacío; un «no» es un dato', () => {
    expect(valor('modelo')).toEqual({ tipo: 'vacio' })
    expect(valor('aceptaPermuta')).toEqual({ tipo: 'vacio' })
    expect(valor('precioNegociable')).toEqual({ tipo: 'texto', texto: 'No' })
    expect(valor('placado')).toEqual({ tipo: 'texto', texto: 'Sí' })
  })

  it('el año va sin separador de miles y el kilometraje con su unidad', () => {
    expect(valor('anio')).toEqual({ tipo: 'texto', texto: '2021' })
    expect(valor('kilometraje')).toEqual({ tipo: 'texto', texto: '42.000 km' })
  })

  it('el precio queda para <Monto>', () => {
    expect(valor('precio')).toEqual({ tipo: 'monto', valor: 24500 })
  })

  it('la categoría muestra su nombre, y una que ya no existe queda vacía', () => {
    expect(valor('categoriaId')).toEqual({ tipo: 'texto', texto: 'SUV' })
    expect(valor('categoriaId', { ...VEHICULO, categoriaId: 'c9' })).toEqual({ tipo: 'vacio' })
  })

  it('sólo se enlaza una dirección web', () => {
    expect(valor('urlOrigen')).toEqual({ tipo: 'enlace', url: 'https://copart.com/lot/1' })
    expect(valor('urlOrigen', { ...VEHICULO, urlOrigen: 'javascript:alert(1)' })).toEqual({
      tipo: 'texto',
      texto: 'javascript:alert(1)',
    })
  })
})
