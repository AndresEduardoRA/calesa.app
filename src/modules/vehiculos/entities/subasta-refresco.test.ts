import { describe, expect, it } from 'vitest'
import type { DatosDeSubasta } from './subasta'
import { fusionarRefresco } from './subasta-refresco'

describe('fusionarRefresco', () => {
  const previo: DatosDeSubasta = {
    columnas: { titulo: 'Titulo viejo', kilometraje: 1000 },
    atributos: { puja: 2500, color: 'Gris' },
    sinCoincidencia: [],
  }
  const nuevo: DatosDeSubasta = {
    columnas: { titulo: 'Titulo nuevo', kilometraje: 1500 },
    atributos: { puja: 4100, color: 'Gris', estado: 'vendido' },
    sinCoincidencia: [],
  }

  it('toma lo nuevo donde la persona no tocó nada', () => {
    const refresco = fusionarRefresco(previo, nuevo, {
      columnas: { titulo: 'Titulo viejo', kilometraje: 1000 },
      atributos: { puja: 2500, color: 'Gris' },
    })
    expect(refresco.columnas).toEqual({ titulo: 'Titulo nuevo', kilometraje: 1500 })
    expect(refresco.atributos).toEqual({ puja: 4100, estado: 'vendido' })
    expect(refresco.conservados).toEqual([])
  })

  it('conserva lo que la persona editó y lo dice', () => {
    const refresco = fusionarRefresco(previo, nuevo, {
      columnas: { titulo: 'Mi título', kilometraje: 1000 },
      atributos: { puja: 3000, color: 'Gris', estado: 'a mano' },
    })
    expect(refresco.columnas).toEqual({ kilometraje: 1500 })
    expect(refresco.atributos).toEqual({})
    expect(refresco.conservados.sort()).toEqual(['estado', 'puja', 'titulo'])
  })

  it('un dato que antes no estaba y la persona completó tampoco se pisa', () => {
    const refresco = fusionarRefresco(
      { columnas: {}, atributos: {}, sinCoincidencia: [] },
      { columnas: { titulo: 'De apibara' }, atributos: { color: 'Rojo' }, sinCoincidencia: [] },
      { columnas: { titulo: 'Escrito a mano' }, atributos: {} },
    )
    expect(refresco.columnas).toEqual({})
    expect(refresco.atributos).toEqual({ color: 'Rojo' })
    expect(refresco.conservados).toEqual(['titulo'])
  })

  it('sin bruto anterior (un vehículo cargado a mano) llena lo vacío y respeta lo escrito', () => {
    const vacio: DatosDeSubasta = { columnas: {}, atributos: {}, sinCoincidencia: [] }
    const refresco = fusionarRefresco(vacio, nuevo, {
      columnas: { titulo: 'A mano' },
      atributos: { color: 'Azul' },
    })
    expect(refresco.columnas).toEqual({ kilometraje: 1500 })
    expect(refresco.atributos).toEqual({ puja: 4100, estado: 'vendido' })
    expect(refresco.conservados.sort()).toEqual(['color', 'titulo'])
  })

  it('lo que la API dejó de traer no borra nada, y lo igual no se reescribe', () => {
    const refresco = fusionarRefresco(
      previo,
      { columnas: {}, atributos: {}, sinCoincidencia: [] },
      { columnas: { titulo: 'x' }, atributos: { puja: 1 } },
    )
    expect(refresco).toEqual({ columnas: {}, atributos: {}, conservados: [] })
    const igual = fusionarRefresco(previo, previo, {
      columnas: previo.columnas,
      atributos: previo.atributos,
    })
    expect(igual).toEqual({ columnas: {}, atributos: {}, conservados: [] })
  })

  it('compara listas por contenido', () => {
    const conLista = (valor: string[]): DatosDeSubasta => ({
      columnas: {},
      atributos: { banderas: valor },
      sinCoincidencia: [],
    })
    const refresco = fusionarRefresco(conLista(['a']), conLista(['a', 'b']), {
      columnas: {},
      atributos: { banderas: ['a'] },
    })
    expect(refresco.atributos).toEqual({ banderas: ['a', 'b'] })
  })
})
