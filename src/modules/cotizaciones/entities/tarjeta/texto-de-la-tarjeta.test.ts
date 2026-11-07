import { describe, expect, it } from 'vitest'
import { formatearMonto } from '@/shared/lib/formato'
import type { GrupoDeTarjeta, ModeloDeTarjeta } from './modelo-de-la-tarjeta'
import { textoDeLaTarjeta } from './texto-de-la-tarjeta'

const usd = (valor: number, locale = 'es-BO') => formatearMonto(valor, { moneda: 'USD', locale })

const compra = (mas: Partial<GrupoDeTarjeta> = {}): GrupoDeTarjeta => ({
  id: 'compra',
  etiqueta: 'Compra',
  tono: 'verde',
  tipoDeCambio: { valor: 'Dólar oficial' },
  plazo: { valor: '48 horas' },
  filas: [
    { nodo: 'remate', etiqueta: 'Remate', leyenda: 'Precio de subasta', usd: 4500 },
    { nodo: 'grua', etiqueta: 'Grúa', leyenda: null, usd: 350.5 },
  ],
  ...mas,
})

function modelo(mas: Partial<ModeloDeTarjeta> = {}): ModeloDeTarjeta {
  return {
    porOmision: false,
    encabezado: {
      titulo: 'Gasolina',
      fecha: '6 nov 2026',
      asesor: 'Ana Rojas',
      numero: 12,
      vencida: false,
    },
    logo: null,
    vehiculo: 'Toyota Corolla 2020',
    grupos: [compra()],
    total: { etiqueta: 'TOTAL DÓLARES', leyenda: 'Todo incluido', usd: 4850.5, bs: null },
    aparte: [{ nodo: 'garantia', etiqueta: 'GARANTÍA', usd: 600 }],
    nota: 'Precios sujetos a cambio.',
    tonos: [],
    ...mas,
  }
}

const lineas = (texto: string) => texto.split('\n')

describe('textoDeLaTarjeta › el encabezado y los grupos', () => {
  it('escribe una guardada entera en el orden del PDF', () => {
    expect(textoDeLaTarjeta(modelo(), { locale: 'es-BO' })).toBe(
      [
        'Gasolina',
        '6 nov 2026 · Cotización n.º 12',
        'Asesor: Ana Rojas',
        'Toyota Corolla 2020',
        '',
        'Compra',
        'Tipo de cambio: Dólar oficial · Plazo: 48 horas',
        `Remate: ${usd(4500)}`,
        'Precio de subasta',
        `Grúa: ${usd(350.5)}`,
        '',
        `TOTAL DÓLARES: ${usd(4850.5)}`,
        'Todo incluido',
        `GARANTÍA: ${usd(600)}`,
        '',
        'Precios sujetos a cambio.',
      ].join('\n'),
    )
  })

  it('en la hoja nueva el encabezado lleva sólo la fecha', () => {
    const texto = textoDeLaTarjeta(
      modelo({
        encabezado: {
          titulo: null,
          fecha: '6 nov 2026',
          asesor: null,
          numero: null,
          vencida: false,
        },
        vehiculo: null,
      }),
      { locale: 'es-BO' },
    )
    expect(lineas(texto).slice(0, 2)).toEqual(['6 nov 2026', ''])
  })

  it('una vencida lo dice en la línea de la fecha', () => {
    const m = modelo()
    const texto = textoDeLaTarjeta(modelo({ encabezado: { ...m.encabezado, vencida: true } }), {
      locale: 'es-BO',
    })
    expect(lineas(texto)[1]).toBe('6 nov 2026 · Cotización n.º 12 · Vencida')
  })

  it('dice «—» en una columna sin valor y omite la que la plantilla no lleva', () => {
    const texto = textoDeLaTarjeta(
      modelo({ grupos: [compra({ tipoDeCambio: { valor: null }, plazo: null })] }),
      { locale: 'es-BO' },
    )
    expect(lineas(texto)).toContain('Tipo de cambio: —')
    expect(texto).not.toContain('Plazo')
  })

  it('un grupo sin columnas no lleva la línea de columnas', () => {
    const texto = textoDeLaTarjeta(
      modelo({ grupos: [compra({ tipoDeCambio: null, plazo: null })] }),
      { locale: 'es-BO' },
    )
    expect(lineas(texto).slice(4, 7)).toEqual(['', 'Compra', `Remate: ${usd(4500)}`])
  })

  it('una fila sin monto dice «—» y no se omite', () => {
    const texto = textoDeLaTarjeta(
      modelo({
        grupos: [
          compra({ filas: [{ nodo: 'remate', etiqueta: 'Remate', leyenda: null, usd: null }] }),
        ],
      }),
      { locale: 'es-BO' },
    )
    expect(lineas(texto)).toContain('Remate: —')
  })
})

describe('textoDeLaTarjeta › el total y la forma', () => {
  it('el total es el del modelo, no la suma de las filas', () => {
    const m = modelo()
    const texto = textoDeLaTarjeta(modelo({ total: { ...m.total, usd: 9999 } }), {
      locale: 'es-BO',
    })
    expect(lineas(texto)).toContain(`TOTAL DÓLARES: ${usd(9999)}`)
  })

  it('sin total dice «—»', () => {
    const m = modelo()
    const texto = textoDeLaTarjeta(modelo({ total: { ...m.total, usd: null } }), {
      locale: 'es-BO',
    })
    expect(lineas(texto)).toContain('TOTAL DÓLARES: —')
  })

  it('suma la línea en Bs sólo si el modelo la trae', () => {
    const m = modelo()
    const sin = textoDeLaTarjeta(m, { locale: 'es-BO' })
    expect(sin).not.toContain('Bs')
    expect(sin).not.toContain('BOB')
    const con = textoDeLaTarjeta(
      modelo({ total: { ...m.total, bs: { valor: 33760.48, moneda: 'BOB' } } }),
      { locale: 'es-BO' },
    )
    const bs = formatearMonto(33760.48, { moneda: 'BOB', locale: 'es-BO' })
    expect(lineas(con).slice(11, 14)).toEqual([
      `TOTAL DÓLARES: ${usd(4850.5)}`,
      'Todo incluido',
      bs,
    ])
  })

  it('la tarjeta por omisión es el encabezado y el total', () => {
    const texto = textoDeLaTarjeta(
      modelo({
        porOmision: true,
        encabezado: { titulo: null, fecha: '6 nov 2026', asesor: null, numero: 3, vencida: false },
        vehiculo: null,
        grupos: [],
        total: { etiqueta: 'Total', leyenda: null, usd: 100, bs: null },
        aparte: [],
        nota: null,
      }),
      { locale: 'es-BO' },
    )
    expect(texto).toBe(['6 nov 2026 · Cotización n.º 3', '', `Total: ${usd(100)}`].join('\n'))
  })
})

describe('textoDeLaTarjeta › los montos', () => {
  it('escribe los montos con el locale de la empresa', () => {
    const es = textoDeLaTarjeta(modelo(), { locale: 'es-BO' })
    const en = textoDeLaTarjeta(modelo(), { locale: 'en-US' })
    expect(lineas(en)).toContain(`Remate: ${usd(4500, 'en-US')}`)
    expect(usd(4500, 'en-US')).not.toBe(usd(4500))
    expect(es).not.toBe(en)
  })

  it('lleva la moneda en cada monto', () => {
    const texto = textoDeLaTarjeta(modelo(), { locale: 'es-BO' })
    expect(lineas(texto).find((l) => l.startsWith('Remate:'))).toContain(usd(4500))
    expect(usd(4500)).toMatch(/US\$|USD|\$/)
  })

  it('nunca deja dos líneas en blanco seguidas, espacios al final ni salto final', () => {
    const texto = textoDeLaTarjeta(modelo({ grupos: [], aparte: [], nota: null, vehiculo: null }), {
      locale: 'es-BO',
    })
    expect(texto).not.toMatch(/\n\n\n/)
    expect(texto).not.toMatch(/[ \t]$/m)
    expect(texto.endsWith('\n')).toBe(false)
  })

  it('separa los grupos con una línea en blanco', () => {
    const logistica = compra({
      id: 'logistica',
      etiqueta: 'Logística',
      tipoDeCambio: null,
      plazo: null,
      filas: [{ nodo: 'flete', etiqueta: 'Flete', leyenda: null, usd: 1200 }],
    })
    const texto = textoDeLaTarjeta(modelo({ grupos: [compra(), logistica] }), { locale: 'es-BO' })
    const l = lineas(texto)
    const i = l.indexOf('Logística')
    expect(l[i - 1]).toBe('')
    expect(l[i + 1]).toBe(`Flete: ${usd(1200)}`)
  })
})
