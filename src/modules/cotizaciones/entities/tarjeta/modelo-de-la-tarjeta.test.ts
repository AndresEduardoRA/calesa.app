import { describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { Estado } from '../motor-contexto'
import type { LecturaDeLaTarjeta, TarjetaLista } from './lectura-de-la-tarjeta'
import { modeloDeLaTarjeta, type PaginaDeLaTarjeta } from './modelo-de-la-tarjeta'

const tono = (clave: string) => ({
  clave,
  claro: { fondo: '#e8f5e9', borde: '#a5d6a7', tinta: '#1b5e20' },
  oscuro: { fondo: '#14301a', borde: '#2e7d32', tinta: '#c8e6c9' },
})

function lectura(mas: Partial<TarjetaLista> = {}): TarjetaLista {
  return {
    estado: 'lista',
    logo: true,
    nota: 'Precios sujetos a cambio.',
    columnas: { leyenda: true, tipoDeCambio: true, plazo: true },
    total: { nodo: 'total', etiqueta: 'TOTAL DÓLARES', leyenda: 'Todo incluido' },
    secundarios: [{ nodo: 'garantia', etiqueta: 'GARANTÍA PARA LA PARTICIPACIÓN' }],
    grupos: [
      {
        id: 'compra',
        etiqueta: 'Compra',
        plazo: '48 horas',
        tono: 'verde',
        bucket: 'compra',
        filas: [
          { nodo: 'remate', etiqueta: 'Remate', leyenda: 'Precio de subasta' },
          { nodo: 'solo_diesel', etiqueta: 'Sólo diésel', leyenda: null },
        ],
      },
      {
        id: 'aduana',
        etiqueta: 'Aduana',
        plazo: null,
        tono: null,
        bucket: null,
        filas: [{ nodo: 'ga', etiqueta: 'GA', leyenda: null }],
      },
    ],
    tiposDeCambio: {
      buckets: new Map([['compra', 'Dólar oficial']]),
      modos: new Map([['paralelo', new Map([['compra', 'Dólar paralelo']])]]),
    },
    variante: {
      nodo: 'variante',
      opciones: [
        { clave: 'gasolina', titulo: 'Gasolina' },
        { clave: 'diesel', titulo: 'Diésel' },
      ],
    },
    tonos: [tono('verde'), tono('naranja')],
    ...mas,
  }
}

const ACTIVOS: Record<string, Estado> = {
  remate: 'activo',
  solo_diesel: 'fuera_de_variante',
  ga: 'activo',
  garantia: 'activo',
  total: 'activo',
}

function calculo(mas: Partial<CalculoDeLaTarjeta> = {}): CalculoDeLaTarjeta {
  return {
    valores: new Map<string, number | string | null>([
      ['variante', 'gasolina'],
      ['remate', 1000],
      ['solo_diesel', 0],
      ['ga', 55],
      ['garantia', 50],
      ['total', 1105],
    ]),
    estados: new Map(Object.entries(ACTIVOS)),
    totales: { usd: 1105, bs: 7690.8 },
    modoTc: null,
    verTotalBs: false,
    ...mas,
  }
}

const pagina: PaginaDeLaTarjeta = {
  fecha: '6 nov 2026',
  vehiculo: 'Toyota Hilux 2020',
  asesor: 'Ana Pérez',
  numero: null,
  vencida: false,
  logo: { nombre: 'Importadora', url: 'https://x.test/logo.webp' },
}

const modelo = (
  l: LecturaDeLaTarjeta = lectura(),
  c: CalculoDeLaTarjeta = calculo(),
  monedaBs: string | null = 'BOB',
  p: PaginaDeLaTarjeta = pagina,
) => modeloDeLaTarjeta({ lectura: l, calculo: c, monedaBs, pagina: p })

describe('modeloDeLaTarjeta: lo que dibuja la tarjeta', () => {
  it('filas sólo activo; el grupo sin filas que dibujar no se dibuja', () => {
    const m = modelo()
    expect(m.grupos.map((g) => g.id)).toEqual(['compra', 'aduana'])
    expect(m.grupos[0]?.filas.map((f) => f.nodo)).toEqual(['remate'])
    const apagado = calculo({
      estados: new Map(Object.entries({ ...ACTIVOS, ga: 'condicion_apagada' })),
    })
    expect(modelo(lectura(), apagado).grupos.map((g) => g.id)).toEqual(['compra'])
  })

  it('cada fila lleva su valor y su leyenda; sin la columna de leyenda, ninguna', () => {
    expect(modelo().grupos[0]?.filas[0]).toEqual({
      nodo: 'remate',
      etiqueta: 'Remate',
      leyenda: 'Precio de subasta',
      usd: 1000,
    })
    const sin = lectura({ columnas: { leyenda: false, tipoDeCambio: true, plazo: true } })
    expect(modelo(sin).grupos[0]?.filas[0]?.leyenda).toBeNull()
  })

  it('el tipo de cambio va una vez por grupo: por modo, sin modo y nulo', () => {
    expect(modelo().grupos[0]?.tipoDeCambio).toEqual({ valor: 'Dólar oficial' })
    expect(modelo(lectura(), calculo({ modoTc: 'paralelo' })).grupos[0]?.tipoDeCambio).toEqual({
      valor: 'Dólar paralelo',
    })
    expect(modelo(lectura(), calculo({ modoTc: 'otro' })).grupos[0]?.tipoDeCambio).toEqual({
      valor: 'Dólar oficial',
    })
    expect(modelo().grupos[1]?.tipoDeCambio).toEqual({ valor: null })
  })

  it('sin la columna, ni tipo de cambio ni plazo; el plazo nulo es «—» y no falta', () => {
    const sin = lectura({ columnas: { leyenda: true, tipoDeCambio: false, plazo: false } })
    expect(modelo(sin).grupos[0]).toMatchObject({ tipoDeCambio: null, plazo: null })
    expect(modelo().grupos[0]?.plazo).toEqual({ valor: '48 horas' })
    expect(modelo().grupos[1]?.plazo).toEqual({ valor: null })
  })

  it('el título de la variante: con y sin clave', () => {
    expect(modelo().encabezado.titulo).toBe('Gasolina')
    const sinClave = calculo({ valores: new Map([['remate', 1000]]) })
    expect(modelo(lectura(), sinClave).encabezado.titulo).toBeNull()
    expect(modelo(lectura({ variante: null })).encabezado.titulo).toBeNull()
  })

  it('el total en Bs, sólo encendido y con los dos números', () => {
    expect(modelo().total.bs).toBeNull()
    const pedido = calculo({ verTotalBs: true })
    expect(modelo(lectura(), pedido).total.bs).toEqual({ valor: 7690.8, moneda: 'BOB' })
    expect(modelo(lectura(), pedido, null).total.bs).toBeNull()
    const sinBs = calculo({ verTotalBs: true, totales: { usd: 1105, bs: null } })
    expect(modelo(lectura(), sinBs).total.bs).toBeNull()
    const sinUsd = calculo({ verTotalBs: true, totales: { usd: null, bs: 7690.8 } })
    expect(modelo(lectura(), sinUsd).total.bs).toBeNull()
  })

  it('lo aparte sólo con estado activo y valor: la garantía apagada no sale', () => {
    expect(modelo().aparte).toEqual([
      { nodo: 'garantia', etiqueta: 'GARANTÍA PARA LA PARTICIPACIÓN', usd: 50 },
    ])
    const apagada = calculo({
      estados: new Map(Object.entries({ ...ACTIVOS, garantia: 'condicion_apagada' })),
    })
    expect(modelo(lectura(), apagada).aparte).toEqual([])
  })

  it('el total lleva la etiqueta y la leyenda de la plantilla; la nota y el logo, también', () => {
    const m = modelo()
    expect(m.total).toMatchObject({
      etiqueta: 'TOTAL DÓLARES',
      leyenda: 'Todo incluido',
      usd: 1105,
    })
    expect(m.nota).toBe('Precios sujetos a cambio.')
    expect(m.logo?.nombre).toBe('Importadora')
    expect(modelo(lectura({ logo: false })).logo).toBeNull()
    expect(modelo(lectura({ nota: null })).nota).toBeNull()
  })
})

describe('modeloDeLaTarjeta: sin plantilla, sin estados y lo que no se nombra', () => {
  it('por omisión: sin grupos ni lo aparte, con el total «Total»', () => {
    const m = modelo({ estado: 'sin_plantilla' })
    expect(m.porOmision).toBe(true)
    expect(m.grupos).toEqual([])
    expect(m.aparte).toEqual([])
    expect(m.nota).toBeNull()
    expect(m.total).toMatchObject({ etiqueta: 'Total', usd: 1105 })
    expect(m.vehiculo).toBe('Toyota Hilux 2020')
    expect(m.logo?.nombre).toBe('Importadora')
    expect(m.encabezado.titulo).toBeNull()
  })

  it('sin estados (el primer recálculo falló) va sólo con el total, con la etiqueta de la plantilla', () => {
    const m = modelo(lectura(), calculo({ estados: null }))
    expect(m.porOmision).toBe(false)
    expect(m.grupos).toEqual([])
    expect(m.aparte).toEqual([])
    expect(m.total.etiqueta).toBe('TOTAL DÓLARES')
  })

  it('un nodo de la hoja que la lectura no nombra no aparece', () => {
    const intruso = calculo({
      valores: new Map<string, number | string | null>([
        ...calculo().valores,
        ['costo_oculto', 777],
      ]),
      estados: new Map(Object.entries({ ...ACTIVOS, costo_oculto: 'activo' })),
    })
    const m = modelo(lectura(), intruso)
    const nodos = [
      ...m.grupos.flatMap((g) => g.filas.map((f) => f.nodo)),
      ...m.aparte.map((a) => a.nodo),
    ]
    expect(nodos).not.toContain('costo_oculto')
    expect(JSON.stringify(m)).not.toContain('777')
  })

  it('los tonos son sólo los que usan los grupos dibujados', () => {
    expect(modelo().tonos.map((t) => t.clave)).toEqual(['verde'])
  })

  it('el encabezado lleva la página: fecha, asesor, número y vencida', () => {
    const m = modelo(lectura(), calculo(), 'BOB', { ...pagina, numero: 41, vencida: true })
    expect(m.encabezado).toMatchObject({
      fecha: '6 nov 2026',
      asesor: 'Ana Pérez',
      numero: 41,
      vencida: true,
    })
  })
})
