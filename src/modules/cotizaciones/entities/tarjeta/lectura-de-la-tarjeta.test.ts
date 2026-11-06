import { describe, expect, it } from 'vitest'
import { tarjetaDesde } from './lectura-de-la-tarjeta'

const tono = (clave: string) => ({
  clave,
  claro: { fondo: '#e8f5e9', borde: '#a5d6a7', tinta: '#1b5e20' },
  oscuro: { fondo: '#14301a', borde: '#2e7d32', tinta: '#c8e6c9' },
})

const lista = (mas: Record<string, unknown> = {}) => ({
  estado: 'lista',
  plantilla: { version: 1 },
  logo: true,
  nota: 'Precios sujetos a cambio.',
  columnas: { leyenda: true, tipo_cambio: true, plazo: true },
  total: { nodo: 'total', etiqueta: 'TOTAL DÓLARES', leyenda: null },
  secundarios: [{ nodo: 'garantia', etiqueta: 'GARANTÍA' }],
  grupos: [
    {
      id: 'compra',
      etiqueta: 'Compra',
      plazo: '48 horas',
      tono: 'verde',
      bucket: 'compra',
      filas: [{ nodo: 'remate', etiqueta: 'Remate', leyenda: null }],
    },
  ],
  tipos_de_cambio: {
    buckets: { compra: 'Dólar oficial' },
    modos: { oficial: { compra: 'Dólar oficial' }, constructor: { compra: null } },
  },
  variante: { nodo: 'variante', opciones: [{ clave: 'gasolina', titulo: 'Gasolina' }] },
  tonos: [tono('verde')],
  moneda_bs: 'BOB',
  ...mas,
})

describe('tarjetaDesde: lo que lee la vista previa de cotizacion_tarjeta()', () => {
  it('lee una plantilla lista', () => {
    const t = tarjetaDesde(lista())
    expect(t).toMatchObject({
      estado: 'lista',
      logo: true,
      nota: 'Precios sujetos a cambio.',
      columnas: { leyenda: true, tipoDeCambio: true, plazo: true },
      total: { nodo: 'total', etiqueta: 'TOTAL DÓLARES', leyenda: null },
    })
    expect(t?.estado === 'lista' && t.grupos[0]?.filas[0]?.nodo).toBe('remate')
  })

  it('lee sin_plantilla sin nada más', () => {
    expect(tarjetaDesde({ estado: 'sin_plantilla' })).toEqual({ estado: 'sin_plantilla' })
  })

  it('los mapas son Map: una clave «constructor» es un modo más', () => {
    const t = tarjetaDesde(lista())
    if (t?.estado !== 'lista') {
      throw new Error('debía ser lista')
    }
    expect(t.tiposDeCambio.buckets).toBeInstanceOf(Map)
    expect(t.tiposDeCambio.modos.get('constructor')?.get('compra')).toBeNull()
    expect(t.tiposDeCambio.modos.get('oficial')?.get('compra')).toBe('Dólar oficial')
  })

  it('sin variante, nulo; sin logo ni nota, falso y nulo', () => {
    const t = tarjetaDesde(lista({ variante: null, logo: null, nota: null }))
    expect(t?.estado === 'lista' && [t.variante, t.logo, t.nota]).toEqual([null, false, null])
  })

  it('sin estado, un grupo sin filas o un tono sin #rrggbb dan nulo', () => {
    expect(tarjetaDesde({ ...lista(), estado: undefined })).toBeNull()
    expect(tarjetaDesde({ ...lista(), estado: 'otra' })).toBeNull()
    const sinFilas = lista().grupos.map(({ filas: _filas, ...resto }) => resto)
    expect(tarjetaDesde(lista({ grupos: sinFilas }))).toBeNull()
    const malo = { ...tono('verde'), claro: { fondo: 'rojo', borde: '#a5d6a7', tinta: '#1b5e20' } }
    expect(tarjetaDesde(lista({ tonos: [malo] }))).toBeNull()
  })

  it('lo que no es un objeto da nulo', () => {
    expect(tarjetaDesde(null)).toBeNull()
    expect(tarjetaDesde('lista')).toBeNull()
  })
})
