import { describe, expect, it } from 'vitest'
import {
  TITULO_DE_ITEM_DE_REPUESTOS,
  TITULO_QUE_NO_SE_VE,
  TITULO_SIN_LEER,
  armarFueraDeRegla,
  textoDeFaltan,
  textoDelAviso,
  unidadesFueraDeReglaDesde,
  type UnidadFueraDeRegla,
} from './fuera-de-regla'

const F1 = '11111111-1111-4111-8111-111111111111'
const F2 = '22222222-2222-4222-8222-222222222222'
const V1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const V2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const R1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

describe('unidadesFueraDeReglaDesde', () => {
  it('lee un vehículo y un ítem de repuestos', () => {
    expect(
      unidadesFueraDeReglaDesde([
        { vehiculo_id: V1, repuesto_id: null, fase_id: F1, faltan: 2 },
        { vehiculo_id: null, repuesto_id: R1, fase_id: F2, faltan: 1 },
      ]),
    ).toEqual([
      { vehiculoId: V1, repuestoId: null, faseId: F1, faltan: 2 },
      { vehiculoId: null, repuestoId: R1, faseId: F2, faltan: 1 },
    ])
  })

  it('una fila rara es error de toda la lectura', () => {
    expect(
      unidadesFueraDeReglaDesde([{ vehiculo_id: V1, repuesto_id: R1, fase_id: F1, faltan: 1 }]),
    ).toBeNull()
    expect(
      unidadesFueraDeReglaDesde([{ vehiculo_id: null, repuesto_id: null, fase_id: F1, faltan: 1 }]),
    ).toBeNull()
    expect(
      unidadesFueraDeReglaDesde([{ vehiculo_id: V1, repuesto_id: null, fase_id: 'x', faltan: 1 }]),
    ).toBeNull()
    expect(unidadesFueraDeReglaDesde('no')).toBeNull()
  })
})

describe('textos', () => {
  it('el aviso concuerda y acota', () => {
    expect(textoDelAviso({ n: 1, hayMas: false })).toBe('1 unidad fuera de regla')
    expect(textoDelAviso({ n: 5, hayMas: false })).toBe('5 unidades fuera de regla')
    expect(textoDelAviso({ n: 50, hayMas: true })).toBe('50+ unidades fuera de regla')
  })

  it('lo que le falta a una unidad', () => {
    expect(textoDeFaltan(1)).toBe('Le falta 1 requisito')
    expect(textoDeFaltan(3)).toBe('Le faltan 3 requisitos')
  })
})

describe('armarFueraDeRegla', () => {
  const fases = [
    { id: F1, nombre: 'Embarcado', activa: true },
    { id: F2, nombre: 'En puerto', activa: false },
  ]
  const unidades: UnidadFueraDeRegla[] = [
    { faseId: F1, vehiculoId: V1, repuestoId: null, faltan: 1 },
    { faseId: F1, vehiculoId: V2, repuestoId: null, faltan: 2 },
    { faseId: F2, vehiculoId: null, repuestoId: R1, faltan: 1 },
  ]

  it('agrupa por fase en el orden en que llegan y rotula la jubilada', () => {
    const grupos = armarFueraDeRegla(unidades, new Map([[V1, 'Toyota Hilux']]), fases)
    expect(grupos.map((g) => g.faseNombre)).toEqual(['Embarcado', 'En puerto (jubilada)'])
    expect(grupos[0]?.unidades).toEqual([
      { clave: V1, titulo: 'Toyota Hilux', faltan: 1 },
      { clave: V2, titulo: TITULO_QUE_NO_SE_VE, faltan: 2 },
    ])
    expect(grupos[1]?.unidades).toEqual([
      { clave: R1, titulo: TITULO_DE_ITEM_DE_REPUESTOS, faltan: 1 },
    ])
  })

  it('si los títulos no se pudieron leer no dice que no se ven', () => {
    const grupos = armarFueraDeRegla(unidades, null, fases)
    expect(grupos[0]?.unidades.map((u) => u.titulo)).toEqual([TITULO_SIN_LEER, TITULO_SIN_LEER])
  })

  it('una fase que ya no está lo dice', () => {
    expect(armarFueraDeRegla(unidades.slice(0, 1), new Map(), [])[0]?.faseNombre).toBe(
      'Fase que ya no existe',
    )
  })
})
