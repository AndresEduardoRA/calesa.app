import { describe, expect, it } from 'vitest'
import { codificarCursor } from '@/shared/lib/paginacion'
import {
  cursorDeStock,
  filaDeStockDesde,
  filasDeStockDesde,
  leerCursorDeStock,
  paginaDeStock,
} from './listado'

const FILA = {
  id: '00000000-0000-4000-8000-000000000001',
  descripcion: 'Faro izquierdo',
  stock_cantidad: 2,
  en_stock_desde: '2026-11-12T13:17:49.123456+00:00',
  proyecto_id: '00000000-0000-4000-8000-000000000002',
  proyecto_numero: 14,
  proyecto_cerrado_en: null,
  vehiculo_id: null,
  vehiculo_titulo: null,
  vehiculo_etiqueta: 'Camión',
}

describe('filaDeStockDesde', () => {
  it('traduce la fila de la base', () => {
    expect(filaDeStockDesde(FILA)).toEqual({
      id: FILA.id,
      descripcion: 'Faro izquierdo',
      stockCantidad: 2,
      enStockDesde: FILA.en_stock_desde,
      proyectoId: FILA.proyecto_id,
      proyectoNumero: 14,
      proyectoCerradoEn: null,
      vehiculoId: null,
      vehiculoTitulo: null,
      vehiculoEtiqueta: 'Camión',
    })
  })

  it('una fila sin la forma esperada es nula', () => {
    expect(filaDeStockDesde({ ...FILA, id: 'no-es-un-uuid' })).toBeNull()
    expect(filaDeStockDesde({ ...FILA, stock_cantidad: 0 })).toBeNull()
    expect(filaDeStockDesde({ ...FILA, en_stock_desde: null })).toBeNull()
  })
})

describe('el cursor del stock', () => {
  it('va y vuelve con la fecha y el id de la fila', () => {
    const fila = filaDeStockDesde(FILA)
    expect(fila).not.toBeNull()
    if (fila === null) return
    expect(leerCursorDeStock(cursorDeStock(fila))).toEqual({ en: FILA.en_stock_desde, id: FILA.id })
  })

  it('lo mal formado, lo ausente o un cursor «anterior» es la primera página', () => {
    expect(leerCursorDeStock(null)).toBeNull()
    expect(leerCursorDeStock('')).toBeNull()
    expect(leerCursorDeStock('%%%')).toBeNull()
    expect(
      leerCursorDeStock(
        codificarCursor({ instante: FILA.en_stock_desde, id: FILA.id, sentido: 'anterior' }),
      ),
    ).toBeNull()
  })
})

describe('la página del stock', () => {
  const fila = (n: number) => ({ ...FILA, id: `00000000-0000-4000-8000-00000000001${n}` })

  it('corta al tamaño y da el cursor de la última sólo si había otra', () => {
    const leidas = filasDeStockDesde([fila(1), fila(2), fila(3)])
    expect(leidas).not.toBeNull()
    if (leidas === null) return
    const pagina = paginaDeStock(leidas, 2)
    expect(pagina.filas.map((f) => f.id)).toEqual([fila(1).id, fila(2).id])
    expect(leerCursorDeStock(pagina.siguiente)).toEqual({ en: FILA.en_stock_desde, id: fila(2).id })
    expect(paginaDeStock(leidas, 3).siguiente).toBeNull()
  })

  it('una fila mala invalida la lectura entera', () => {
    expect(filasDeStockDesde([fila(1), { ...FILA, id: 'x' }])).toBeNull()
    expect(filasDeStockDesde(null)).toBeNull()
  })
})
