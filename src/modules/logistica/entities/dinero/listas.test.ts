import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import {
  codificarCursor,
  leerCursor,
  type Cursor,
  TAMANO_DE_PAGINA_POR_DEFECTO,
} from '@/shared/lib/paginacion'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import {
  cursorDeFila,
  deLaFecha,
  esquemaDeFiltrosDeDinero,
  filasDeGastoDesde,
  filasDePagoDesde,
  paginaDeDinero,
  pedidoDeDinero,
  rutaDeLaLista,
  vistaDe,
  type VistaDeDinero,
} from './listas'

const ORIGEN_A = '11111111-1111-4111-8111-111111111111'
const ORIGEN_B = '22222222-2222-4222-8222-222222222222'
const CATEGORIA = '33333333-3333-4333-8333-333333333333'
const ID = '44444444-4444-4444-8444-444444444444'

const esquema = (vista: VistaDeDinero) =>
  esquemaDeFiltrosDeDinero(vista, {
    origenes: [
      { id: ORIGEN_A, nombre: 'Miami' },
      { id: ORIGEN_B, nombre: 'Dubái' },
    ],
    categorias: [{ id: CATEGORIA, nombre: 'Flete' }],
  })

const pedido = (vista: VistaDeDinero, url: Record<string, string>, cursor: Cursor | null = null) =>
  pedidoDeDinero(vista, leerFiltros(esquema(vista), url), { cursor })

const filaDeGasto = {
  id: ID,
  vehiculo_id: ID,
  vehiculo_titulo: 'Toyota Hilux',
  origen_id: ORIGEN_A,
  categoria_id: CATEGORIA,
  categoria_nombre: 'Flete',
  moneda: 'EUR',
  monto: 100,
  tipo_cambio_aplicado: null,
  monto_base: 110,
  fecha: '2026-11-10',
  proveedor: null,
  comprobante_ruta: null,
  lote_id: null,
  actualizado_en: '2026-11-10T10:00:00Z',
}

describe('lo que la URL pide a la base', () => {
  it('gastos manda la categoría y nunca «sin confirmar»', () => {
    expect(
      pedido('gastos', { categoria: CATEGORIA, confirmacion: 'sin_confirmar', origen: ORIGEN_A })
        .filtros,
    ).toEqual({ origen: ORIGEN_A, categoria: CATEGORIA })
  })

  it('pagos manda «sin confirmar» sólo con la elección y nunca la categoría', () => {
    expect(
      pedido('pagos', { confirmacion: 'sin_confirmar', categoria: CATEGORIA }).filtros,
    ).toEqual({
      sin_confirmar: true,
    })
    expect(pedido('pagos', { categoria: CATEGORIA }).filtros).toEqual({})
  })

  it('el rango de fechas llega como desde y hasta', () => {
    expect(
      pedido('pagos', { 'fecha.desde': '2026-11-01', 'fecha.hasta': '2026-11-30' }).filtros,
    ).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' })
  })

  it('un origen que no se ofrece y un cursor hacia atrás se descartan', () => {
    const atras = leerCursor(
      codificarCursor({ instante: '2026-11-10T00:00:00Z', id: ID, sentido: 'anterior' }),
    )
    expect(pedido('gastos', { origen: 'cualquiera' }, atras).filtros).toEqual({})
    expect(pedido('gastos', {}, atras).cursor).toBeNull()
  })

  it('ninguna combinación de URL produce una clave que la base rechace', () => {
    const claves = {
      gastos: ['origen', 'categoria', 'desde', 'hasta'],
      pagos: ['origen', 'desde', 'hasta', 'sin_confirmar'],
    }
    const url = {
      origen: ORIGEN_B,
      categoria: CATEGORIA,
      confirmacion: 'sin_confirmar',
      'fecha.desde': '2026-01-01',
      'fecha.hasta': '2026-12-31',
      sin_confirmar: 'true',
      desde: '2026-01-01',
    }
    for (const vista of ['gastos', 'pagos'] as const) {
      for (const clave of Object.keys(pedido(vista, url).filtros)) {
        expect(claves[vista]).toContain(clave)
      }
    }
  })

  it('el origen sólo se ofrece con dos o más donde elegir', () => {
    const uno = esquemaDeFiltrosDeDinero('gastos', {
      origenes: [{ id: ORIGEN_A, nombre: 'Miami' }],
      categorias: [],
    })
    expect(uno.filtros.map((f) => f.clave)).toEqual(['categoria', 'fecha'])
  })

  it('la ruta de «Ver todos» lleva la vista y el origen de la unidad', () => {
    expect(rutaDeLaLista({ vista: 'pagos', origenId: ORIGEN_A })).toBe(
      `/logistica/gastos?ver=pagos&origen=${ORIGEN_A}`,
    )
    expect(rutaDeLaLista({ vista: 'gastos' })).toBe('/logistica/gastos?ver=gastos')
  })
})

describe('la vista de ?ver=', () => {
  const permisos = (claves: ClavePermiso[]): Permisos =>
    claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

  it('la pedida si puede; si no, la que sí; ninguna, nulo', () => {
    expect(vistaDe('pagos', permisos(['logistica.gastos.ver', 'logistica.pagos.ver']))).toBe(
      'pagos',
    )
    expect(vistaDe('pagos', permisos(['logistica.gastos.ver']))).toBe('gastos')
    expect(vistaDe('x', permisos(['logistica.pagos.ver']))).toBe('pagos')
    expect(vistaDe('gastos', permisos([]))).toBeNull()
  })
})

describe('el cursor de fecha', () => {
  it('ida y vuelta de la fecha y el id', () => {
    const cursor = leerCursor(cursorDeFila({ fecha: '2026-11-10', id: ID }))
    expect(cursor).not.toBeNull()
    expect(cursor && deLaFecha(cursor)).toEqual({ fecha: '2026-11-10', id: ID })
  })

  it('un cursor de otra lista (con hora) da nulo', () => {
    const otro = leerCursor(
      codificarCursor({ instante: '2026-11-10T10:30:00Z', id: ID, sentido: 'siguiente' }),
    )
    expect(otro && deLaFecha(otro)).toBeNull()
  })

  it('con una fila de más hay siguiente, y nunca anterior', () => {
    const filas = Array.from({ length: TAMANO_DE_PAGINA_POR_DEFECTO + 1 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      fecha: '2026-11-10',
    }))
    const pagina = paginaDeDinero(filas)
    expect(pagina.filas).toHaveLength(TAMANO_DE_PAGINA_POR_DEFECTO)
    expect(pagina.siguiente).not.toBeNull()
    expect(pagina.anterior).toBeNull()
    expect(paginaDeDinero(filas.slice(0, TAMANO_DE_PAGINA_POR_DEFECTO)).siguiente).toBeNull()
  })
})

describe('las filas que devuelve la base', () => {
  it('un gasto sin tasa ni proveedor se acepta', () => {
    expect(filasDeGastoDesde([filaDeGasto])?.[0]).toMatchObject({
      tipoCambioAplicado: null,
      montoBase: 110,
      vehiculoTitulo: 'Toyota Hilux',
    })
  })

  it('una fila con forma mala da nulo', () => {
    expect(filasDeGastoDesde([{ ...filaDeGasto, monto_base: '110' }])).toBeNull()
    expect(filasDeGastoDesde([{ ...filaDeGasto, id: 'no-es-guid' }])).toBeNull()
  })

  it('un pago sin confirmar acepta confirmado_por nulo', () => {
    const pago = {
      id: ID,
      vehiculo_id: ID,
      vehiculo_titulo: 'Toyota Hilux',
      origen_id: ORIGEN_A,
      concepto: 'Anticipo',
      moneda: 'USD',
      monto: 50,
      tipo_cambio_aplicado: null,
      monto_base: 50,
      metodo: null,
      fecha: '2026-11-10',
      confirmado: false,
      confirmado_por: null,
      confirmado_en: null,
      comprobante_ruta: null,
      actualizado_en: '2026-11-10T10:00:00Z',
    }
    expect(filasDePagoDesde([pago])?.[0]).toMatchObject({ confirmado: false, confirmadoPor: null })
  })
})
