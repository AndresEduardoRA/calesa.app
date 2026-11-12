// Una cotización de repuestos tal como la dibuja la lista de la pestaña «Cotizaciones» (8.12-3, C1). Puro: la lectura
// (`infra/cotizador/cotizaciones.ts`) la arma con `filasDeCotizacionDesde`. El total lo calcula la base al guardar (8.12-1) y llega como texto
// (`total::text`): acá se lee, nunca se calcula, y nulo no es 0.
import { z } from 'zod'
import { RUTAS } from '@/shared/lib/rutas'

// Lo más que lee la lista de un proyecto: 50 cotizaciones (se piden 51 para saber si hay más; `cortarAlTope`). No es un total.
export const TOPE_DE_COTIZACIONES = 50

export const COLUMNAS_DE_COTIZACION =
  'id, numero, estado, moneda, total::text, creado_en, aceptada_en'

export const ESTADOS_DE_COTIZACION = ['borrador', 'aceptada', 'anulada'] as const
export type EstadoDeCotizacion = (typeof ESTADOS_DE_COTIZACION)[number]

export const ETIQUETA_DEL_ESTADO: Readonly<Record<EstadoDeCotizacion, string>> = {
  borrador: 'Borrador',
  aceptada: 'Aceptada',
  anulada: 'Anulada',
}

// Un monto de `numeric(18,2)` leído como texto.
export const montoEnTexto = z.string().regex(/^-?\d+(\.\d+)?$/)

export const camposDeCotizacion = {
  id: z.guid(),
  numero: z.number().int(),
  estado: z.enum(ESTADOS_DE_COTIZACION),
  moneda: z.string().min(1),
  total: montoEnTexto.nullable(),
  creado_en: z.string(),
  aceptada_en: z.string().nullable(),
}

const esquemaDeFila = z.object(camposDeCotizacion)

export type FilaDeCotizacion = {
  id: string
  numero: number
  estado: EstadoDeCotizacion
  moneda: string
  // Texto exacto; nulo si alguna línea no tiene total (D6 de 8.12-1).
  total: string | null
  creadoEn: string
  aceptadaEn: string | null
}

export function aFilaDeCotizacion(f: z.infer<typeof esquemaDeFila>): FilaDeCotizacion {
  return {
    id: f.id,
    numero: f.numero,
    estado: f.estado,
    // `char(3)`: la base rellena con espacios si el código fuera más corto.
    moneda: f.moneda.trim(),
    total: f.total,
    creadoEn: f.creado_en,
    aceptadaEn: f.aceptada_en,
  }
}

/** Las filas de `repuestos_cotizaciones` de la lista; nulo si alguna no tiene la forma esperada. */
export function filasDeCotizacionDesde(datos: unknown): FilaDeCotizacion[] | null {
  const leido = z.array(esquemaDeFila).safeParse(datos)
  return leido.success ? leido.data.map(aFilaDeCotizacion) : null
}

/** La hoja de una cotización: `/repuestos/<proyecto>/cotizaciones/<id>` (el área no importa la de proyectos). */
export function rutaDeLaCotizacion(proyectoId: string, id: string): string {
  return `${RUTAS.repuestos}/${proyectoId}/cotizaciones/${id}`
}
