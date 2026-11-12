import { z } from 'zod'

// El margen de una unidad (6.11-1): lo que devuelve `margen_vehiculo` y cómo se escribe cada cifra. La base dice `null` donde no hay dato (sin cotización final, sin
// venta registrada): ahí se escribe el texto, **nunca 0**; un 0 verdadero (sin gastos, margen justo en cero) sí es un monto.

const esquemaDeCategoria = z.object({
  categoria_id: z.guid(),
  nombre: z.string(),
  proposito: z.string().nullable(),
  real: z.number(),
})

const esquemaDeMargen = z.object({
  cotizado: z.number().nullable(),
  real: z.number(),
  desviacion: z.number().nullable(),
  venta: z.number().nullable(),
  margen: z.number().nullable(),
  por_categoria: z.array(esquemaDeCategoria),
})

export type RealPorCategoria = { categoriaId: string; nombre: string; real: number }

export type Margen = {
  cotizado: number | null
  real: number
  desviacion: number | null
  venta: number | null
  margen: number | null
  porCategoria: RealPorCategoria[]
}

/** La respuesta de `margen_vehiculo` como `Margen`; nula si no tiene la forma esperada. */
export function margenDesde(datos: unknown): Margen | null {
  const leido = esquemaDeMargen.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const m = leido.data
  return {
    cotizado: m.cotizado,
    real: m.real,
    desviacion: m.desviacion,
    venta: m.venta,
    margen: m.margen,
    porCategoria: m.por_categoria.map((c) => ({
      categoriaId: c.categoria_id,
      nombre: c.nombre,
      real: c.real,
    })),
  }
}

export const SIN_COTIZACION_FINAL = 'Sin cotización final'
export const SIN_VENTA_REGISTRADA = 'Sin venta registrada'
export const SIN_GASTOS_REGISTRADOS = 'Sin gastos registrados'
export const SIN_PERMISO_DE_MARGEN = 'No tienes permiso para ver el margen.'

export type ClaveDeCifra = 'cotizado' | 'real' | 'desviacion' | 'venta' | 'margen'

export type CifraDelMargen = {
  clave: ClaveDeCifra
  etiqueta: string
  // El monto en la moneda base; nulo cuando la base no tiene dato (se escribe `sinDato`).
  monto: number | null
  sinDato: string | null
  // Lo que acompaña a la cifra para no depender del color («por debajo de lo cotizado»).
  nota: string | null
}

function notaDeLaDesviacion(desviacion: number | null): string | null {
  if (desviacion === null) {
    return null
  }
  if (desviacion > 0) {
    return 'por debajo de lo cotizado'
  }
  return desviacion < 0 ? 'por encima de lo cotizado' : 'igual a lo cotizado'
}

type Linea = { clave: ClaveDeCifra; etiqueta: string; sinDato: string; nota?: string | null }

function cifra(
  monto: number | null,
  { clave, etiqueta, sinDato, nota = null }: Linea,
): CifraDelMargen {
  return monto === null
    ? { clave, etiqueta, monto: null, sinDato, nota: null }
    : { clave, etiqueta, monto, sinDato: null, nota }
}

/** Las cinco cifras del hueco «Margen», en su orden. Un `null` de la base nunca se vuelve 0 y un 0 de la base nunca se vuelve el texto del nulo. */
export function textosDelMargen(margen: Margen): CifraDelMargen[] {
  return [
    cifra(margen.cotizado, {
      clave: 'cotizado',
      etiqueta: 'Cotizado (final)',
      sinDato: SIN_COTIZACION_FINAL,
    }),
    cifra(margen.real, { clave: 'real', etiqueta: 'Real', sinDato: SIN_GASTOS_REGISTRADOS }),
    cifra(margen.desviacion, {
      clave: 'desviacion',
      etiqueta: 'Desviación',
      sinDato: SIN_COTIZACION_FINAL,
      nota: notaDeLaDesviacion(margen.desviacion),
    }),
    cifra(margen.venta, { clave: 'venta', etiqueta: 'Venta', sinDato: SIN_VENTA_REGISTRADA }),
    cifra(margen.margen, { clave: 'margen', etiqueta: 'Margen', sinDato: SIN_VENTA_REGISTRADA }),
  ]
}
