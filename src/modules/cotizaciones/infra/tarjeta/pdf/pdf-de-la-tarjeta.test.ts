// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { textoDelPdf } from '../../../../../../scripts/pdf/texto-del-pdf'
import { formatearMonto } from '@/shared/lib/formato'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  modeloDeLaTarjeta,
  type PaginaDeLaTarjeta,
} from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { calculoDePrueba, crudaDeLaTarjeta } from '../../../entities/tarjeta/tarjeta.soporte'
import type { CalculoDeLaTarjeta } from '../../../entities/calculo-de-la-tarjeta'

vi.mock('server-only', () => ({}))

import { pdfDeLaTarjeta } from './pdf-de-la-tarjeta'

// El documento de la tarjeta (4.18-3a, C6–C8): el modelo de la tarjeta dibujado con el renderer real y leído con el lector de las pruebas.
const PAGINA: PaginaDeLaTarjeta = {
  fecha: '6 nov 2026',
  vehiculo: 'Toyota Hilux 2020',
  asesor: 'Ana Pérez',
  numero: 12,
  vencida: false,
  logo: null,
}

const lecturaDe = (mas: Record<string, unknown> = {}) => {
  const lectura = tarjetaDesde(crudaDeLaTarjeta(mas))
  if (lectura === null) {
    throw new Error('La tarjeta de prueba no cumple su esquema.')
  }
  return lectura
}

async function leer(
  entrada: {
    lectura?: ReturnType<typeof lecturaDe>
    calculo?: CalculoDeLaTarjeta
    pagina?: Partial<PaginaDeLaTarjeta>
    locale?: string
  } = {},
) {
  const modelo = modeloDeLaTarjeta({
    lectura: entrada.lectura ?? lecturaDe(),
    calculo: entrada.calculo ?? calculoDePrueba(),
    monedaBs: 'BOB',
    pagina: { ...PAGINA, ...entrada.pagina },
  })
  const bytes = await pdfDeLaTarjeta({
    modelo,
    locale: entrada.locale ?? 'es-BO',
    logo: null,
    empresa: 'Importadora Prueba',
  })
  return {
    bytes,
    leido: textoDelPdf(bytes),
    lineas: textoDelPdf(bytes).paginas.flatMap((p) => p.lineas),
  }
}

const usd = (valor: number, locale = 'es-BO') => formatearMonto(valor, { moneda: 'USD', locale })

describe('pdfDeLaTarjeta: la tarjeta de una cotización en A4', () => {
  it('lleva el encabezado, la banda, cada grupo con sus filas y montos, el total, lo aparte y la nota, en ese orden', async () => {
    const { bytes, lineas } = await leer()
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-')
    const orden = [
      'Gasolina',
      'Asesor: Ana Pérez',
      'Toyota Hilux 2020',
      'Compra',
      `Remate ${usd(1000)}`,
      'Precio de subasta',
      'Logística',
      `Flete ${usd(300)}`,
      'Aduana',
      `GA ${usd(55)}`,
      `TOTAL DÓLARES ${usd(1355)}`,
      `GARANTÍA PARA LA PARTICIPACIÓN ${usd(50)}`,
      'Precios sujetos a cambio.',
    ]
    const posiciones = orden.map((l) => lineas.indexOf(l))
    expect(
      posiciones.every((p) => p >= 0),
      JSON.stringify(lineas),
    ).toBe(true)
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones)
    expect(lineas.some((l) => l.includes('6 nov 2026') && l.includes('Cotización n.º 12'))).toBe(
      true,
    )
    expect(lineas.some((l) => l.includes('Vencida'))).toBe(false)
  })

  it('el tipo de cambio y el plazo van una vez por grupo, en su línea; «—» sin valor', async () => {
    const { lineas } = await leer()
    expect(lineas.filter((l) => l.includes('Tipo de cambio'))).toHaveLength(3)
    expect(lineas).toContain('Tipo de cambio Dólar oficial Plazo 48 horas')
    expect(lineas).toContain('Tipo de cambio Dólar paralelo Plazo 15 días')
    expect(lineas).toContain('Tipo de cambio Dólar oficial Plazo —')
  })

  it('los montos van con el locale de la empresa', async () => {
    const { lineas } = await leer({ locale: 'en-US' })
    expect(lineas).toContain(`Remate ${usd(1000, 'en-US')}`)
    expect(usd(1000, 'en-US')).not.toBe(usd(1000))
  })

  it('cada grupo lleva el fondo claro de su tono', async () => {
    const { leido } = await leer()
    for (const fondo of ['#e8f5e9', '#fff7d6', '#ffe8d6']) {
      expect(leido.rellenos).toContain(fondo)
    }
    expect(leido.rellenos).not.toContain('#222222')
  })

  it('el total en Bs va sólo si el modelo lo trae, con su moneda', async () => {
    const bs = formatearMonto(9430.8, { moneda: 'BOB', locale: 'es-BO' })
    // Sin «Ver total Bs» no hay ninguna línea en Bs (ni con otro número).
    expect(bs).toContain('Bs')
    expect((await leer()).lineas.filter((l) => l.includes('Bs'))).toEqual([])
    const { lineas } = await leer({ calculo: calculoDePrueba({ verTotalBs: true }) })
    expect(lineas).toContain(bs)
  })
})

describe('pdfDeLaTarjeta: lo que cambia según el modelo', () => {
  it('el total impreso es el del cálculo, no la suma de las filas', async () => {
    const { lineas } = await leer({
      calculo: calculoDePrueba({ totales: { usd: 1500, bs: null } }),
    })
    expect(lineas).toContain(`TOTAL DÓLARES ${usd(1500)}`)
    expect(lineas).not.toContain(`TOTAL DÓLARES ${usd(1355)}`)
  })

  it('vencida lo dice en el encabezado', async () => {
    const { lineas } = await leer({ pagina: { vencida: true } })
    expect(lineas.some((l) => l.includes('Cotización n.º 12') && l.includes('Vencida'))).toBe(true)
  })

  it('sin plantilla, la tarjeta por omisión: el encabezado y «Total», sin grupos ni nota', async () => {
    const { lineas } = await leer({
      lectura: tarjetaDesde({ estado: 'sin_plantilla' }) ?? lecturaDe(),
    })
    expect(lineas).toContain(`Total ${usd(1355)}`)
    for (const fuera of [
      'Compra',
      'Logística',
      'Aduana',
      'Precios sujetos a cambio.',
      'Tipo de cambio',
    ]) {
      expect(lineas.some((l) => l.includes(fuera))).toBe(false)
    }
  })

  it('un monto nulo es «—»', async () => {
    const calculo = calculoDePrueba()
    const valores = new Map(calculo.valores)
    valores.set('flete', null)
    const { lineas } = await leer({ calculo: { ...calculo, valores } })
    expect(lineas).toContain('Flete —')
  })

  it('sin logo no hay imágenes; los metadatos no nombran al cliente, al asesor ni al vehículo', async () => {
    const { bytes, leido } = await leer()
    expect(leido.imagenes).toBe(0)
    const crudo = new TextDecoder('latin1').decode(bytes)
    const utf16 = (s: string) =>
      [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
    for (const nombre of ['Ana Pérez', 'Toyota Hilux']) {
      expect(crudo.includes(nombre)).toBe(false)
      expect(crudo.toLowerCase().includes(utf16(nombre))).toBe(false)
    }
    expect(crudo).toMatch(/\/Author\b/)
    expect(crudo).not.toMatch(/\/Subject\b|\/Keywords\b/)
  })
})
