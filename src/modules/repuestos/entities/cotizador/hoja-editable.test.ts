import { describe, expect, it } from 'vitest'

import casos from './casos-del-cotizador.json'
import {
  calcularHoja,
  cantidadDeCelda,
  hayCambios,
  itemsDisponibles,
  lineaEditableDesde,
  lineaNueva,
  montoDeCelda,
  motivoParaNoAceptar,
  pedidoDeGuardar,
  type LineaEditable,
} from './hoja-editable'
import type { LineaDeLectura } from './hoja-de-lectura'
import { leerSnapshot, type SnapshotDelCotizador } from './snapshot'

// La configuración del e2e (V19): factor 1,35, recargo 10 %, redondeo 1; tramo USD [0, 100) → 15; cajas 10 y 5.
function snapshotDelE2e(): SnapshotDelCotizador {
  const leido = leerSnapshot({
    ...casos.configs.A,
    cajas: [
      { id: '00000000-0000-4000-8000-0000000000c1', monto: '5.00' },
      { id: '00000000-0000-4000-8000-0000000000c2', monto: '10.00' },
    ],
  })
  if (!leido.ok) throw new Error('el snapshot del test no es válido')
  return leido.snapshot
}

const ID_A = '00000000-0000-4000-8000-0000000000a1'
const ID_B = '00000000-0000-4000-8000-0000000000b1'
const ITEM = '00000000-0000-4000-8000-0000000000d1'

const importada: LineaEditable = {
  id: ID_A,
  itemId: ITEM,
  descripcion: 'Filtro de aceite',
  bloque: 'importado',
  cantidad: 1,
  costo: '80.00',
  logistica: null,
  caja: '10.00',
}

const local: LineaEditable = {
  id: ID_B,
  itemId: null,
  descripcion: 'Aceite local',
  bloque: 'local',
  cantidad: 2,
  costo: '90.00',
  logistica: null,
  caja: '5.00',
}

describe('montoDeCelda: lo que emite la celda pasa a texto exacto', () => {
  it.each([
    [80, '80.00'],
    [0.1, '0.10'],
    [0, '0.00'],
    [133.5, '133.50'],
    [999999999999.99, '999999999999.99'],
  ])('%s → %s', (valor, texto) => {
    expect(montoDeCelda(valor)).toEqual({ ok: true, valor: texto })
  })

  it('vacío es nulo (nulo no es 0)', () => {
    expect(montoDeCelda(null)).toEqual({ ok: true, valor: null })
  })

  it.each([[-1], [1.005], [1e21], [1000000000000], [Number.NaN]])('%s no entra', (valor) => {
    expect(montoDeCelda(valor).ok).toBe(false)
  })
})

describe('cantidadDeCelda: un entero de 1 a 100000', () => {
  it.each([[1], [2], [100000]])('%s entra', (valor) => {
    expect(cantidadDeCelda(valor)).toEqual({ ok: true, valor })
  })

  it.each([[0], [1.5], [100001], [null], [-3]])('%s no entra', (valor) => {
    expect(cantidadDeCelda(valor)).toEqual({
      ok: false,
      error: 'La cantidad es un entero de 1 a 100000.',
    })
  })
})

describe('calcularHoja: la misma fórmula exacta que la base', () => {
  const snapshot = snapshotDelE2e()

  it('importado 80 / sugerida / 10 → 133; local 90 / sugerida / 5 × 2 → 242; total 375', () => {
    const hoja = calcularHoja(snapshot, [importada, local])
    expect(hoja.lineas[ID_A]).toMatchObject({ logisticaSugerida: '15.00', total: '133.00' })
    expect(hoja.lineas[ID_B]).toMatchObject({ logisticaSugerida: '15.00', total: '242.00' })
    expect(hoja.total).toBe('375.00')
  })

  it('una línea sin caja deja la cotización sin total: nulo, nunca la suma de las otras', () => {
    const hoja = calcularHoja(snapshot, [importada, { ...local, caja: null }])
    expect(hoja.lineas[ID_B]).toMatchObject({ total: null, falta: 'caja' })
    expect(hoja.total).toBeNull()
  })

  it('sin tramo no hay sugerencia y falta la logística (no asume 0)', () => {
    const hoja = calcularHoja(snapshot, [{ ...importada, costo: '5000.00' }])
    expect(hoja.lineas[ID_A]).toMatchObject({ logisticaSugerida: null, falta: 'logistica' })
    expect(hoja.total).toBeNull()
  })

  it('sin líneas no hay total', () => {
    expect(calcularHoja(snapshot, []).total).toBeNull()
  })
})

describe('pedidoDeGuardar: lo que se manda a la base', () => {
  it('la logística sugerida (↺) va como null y nunca van total ni sugerencias', () => {
    const pedido = pedidoDeGuardar([importada])
    expect(pedido).toEqual([
      {
        id: ID_A,
        itemId: ITEM,
        descripcion: 'Filtro de aceite',
        bloque: 'importado',
        cantidad: 1,
        costo: '80.00',
        logistica: null,
        caja: '10.00',
      },
    ])
    expect(Object.keys(pedido[0] ?? {})).not.toContain('total')
  })

  it('importado antes que local, cada bloque en su orden', () => {
    const otraLocal = { ...local, id: '00000000-0000-4000-8000-0000000000b2' }
    const pedido = pedidoDeGuardar([local, importada, otraLocal])
    expect(pedido.map((l) => l.id)).toEqual([ID_A, ID_B, otraLocal.id])
  })

  it('una logística escrita va tal cual', () => {
    expect(pedidoDeGuardar([{ ...importada, logistica: '0.00' }])[0]?.logistica).toBe('0.00')
  })
})

describe('lineaEditableDesde y lineaNueva', () => {
  const leida: LineaDeLectura = {
    id: ID_A,
    itemId: ITEM,
    descripcion: 'Filtro de aceite',
    bloque: 'importado',
    cantidad: 1,
    costo: '80.00',
    logistica: '15.00',
    esSugerida: true,
    caja: '10.00',
    total: '133.00',
    orden: 1,
    falta: null,
  }

  it('una línea leída con la logística sugerida queda con la escrita nula', () => {
    expect(lineaEditableDesde(leida).logistica).toBeNull()
    expect(lineaEditableDesde({ ...leida, esSugerida: false }).logistica).toBe('15.00')
  })

  it('una línea nueva nace sin caja elegida (olvidarla no cotiza por debajo)', () => {
    const nueva = lineaNueva(ID_B, 'local')
    expect(nueva).toMatchObject({
      itemId: null,
      cantidad: 1,
      costo: null,
      logistica: null,
      caja: null,
    })
    const desdeItem = lineaNueva(ID_B, 'importado', {
      id: ITEM,
      descripcion: 'Filtro',
      cantidad: 3,
    })
    expect(desdeItem).toMatchObject({
      itemId: ITEM,
      descripcion: 'Filtro',
      cantidad: 3,
      caja: null,
    })
  })

  it('un ítem ya cotizado no se ofrece otra vez', () => {
    const otro = { id: '00000000-0000-4000-8000-0000000000d2', descripcion: 'Bujía', cantidad: 4 }
    const items = [{ id: ITEM, descripcion: 'Filtro', cantidad: 1 }, otro]
    expect(itemsDisponibles(items, [importada])).toEqual([otro])
  })

  it('hay cambios cuando lo local difiere de lo leído', () => {
    expect(hayCambios([importada], [importada], 'x', 'x')).toBe(false)
    expect(hayCambios([importada], [{ ...importada, costo: '81.00' }], 'x', 'x')).toBe(true)
    expect(hayCambios([importada], [importada], 'x', 'y')).toBe(true)
  })
})

describe('motivoParaNoAceptar: en su orden', () => {
  it('sin permiso para editar ítems, primero eso', () => {
    expect(
      motivoParaNoAceptar({ puedeEditarItems: false, sinGuardar: true, totalGuardado: null }),
    ).toMatch(/permiso para editar ítems/)
  })

  it('con cambios sin guardar, después eso', () => {
    expect(
      motivoParaNoAceptar({ puedeEditarItems: true, sinGuardar: true, totalGuardado: null }),
    ).toBe('Guarda los cambios antes de aceptar.')
  })

  it('con el total guardado nulo, el texto de la base', () => {
    expect(
      motivoParaNoAceptar({ puedeEditarItems: true, sinGuardar: false, totalGuardado: null }),
    ).toBe('Para aceptarla, cada línea necesita su total.')
  })

  it('con todo, se puede', () => {
    expect(
      motivoParaNoAceptar({ puedeEditarItems: true, sinGuardar: false, totalGuardado: '375.00' }),
    ).toBeNull()
  })
})
