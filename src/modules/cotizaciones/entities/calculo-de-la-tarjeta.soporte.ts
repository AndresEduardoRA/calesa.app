// Un cálculo de la tarjeta para las pruebas de la hoja y de la tarjeta (4.18-2): remate, flete, GA y garantía activos, con el total en dólares y en Bs. Sólo para las pruebas
// (el sufijo `.soporte.` lo deja fuera del mapa).
import type { CalculoDeLaTarjeta } from './calculo-de-la-tarjeta'
import type { Estado } from './motor-contexto'

const TODOS: Record<string, Estado> = {
  remate: 'activo',
  flete: 'activo',
  ga: 'activo',
  garantia: 'activo',
  total: 'activo',
}

export const calculoDePrueba = (mas: Partial<CalculoDeLaTarjeta> = {}): CalculoDeLaTarjeta => ({
  valores: new Map<string, number | string | null>([
    ['variante', 'gasolina'],
    ['remate', 1000],
    ['flete', 300],
    ['ga', 55],
    ['garantia', 50],
    ['total', 1355],
  ]),
  estados: new Map(Object.entries(TODOS)),
  totales: { usd: 1355, bs: 9430.8 },
  modoTc: null,
  verTotalBs: false,
  ...mas,
})
