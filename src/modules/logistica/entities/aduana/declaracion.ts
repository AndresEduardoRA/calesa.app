import { z } from 'zod'
import type { Database } from '@/shared/types/database.types'

// Las declaraciones aduaneras tal como las devuelven `declaraciones_listar()` y `declaracion_leer()` (6.09-1). Puro: la infra pasa lo que leyó y acá se valida y se nombra.
// «Pagada» y «faltan» los calcula la base (D1): nunca se derivan en el navegador.

export type CanalDeAforo = Database['public']['Enums']['canal_aforo']

// Los valores salen del tipo generado de la base; el texto de cada uno, de un `Record` exhaustivo (D3): un canal nuevo no compila hasta que tenga su texto.
const TEXTO_DEL_CANAL: Record<CanalDeAforo, string> = {
  verde: 'Verde',
  amarillo: 'Amarillo',
  rojo: 'Rojo',
}

export const CANALES_DE_AFORO = Object.keys(TEXTO_DEL_CANAL) as CanalDeAforo[]

export function esCanalDeAforo(valor: unknown): valor is CanalDeAforo {
  return CANALES_DE_AFORO.some((canal) => canal === valor)
}

/** «Verde», «Amarillo», «Rojo»; sin canal, «Sin canal». */
export function textoDelCanal(canal: CanalDeAforo | null): string {
  return canal === null ? 'Sin canal' : TEXTO_DEL_CANAL[canal]
}

export type FilaDeDeclaracion = {
  id: string
  numero: string
  canal: CanalDeAforo | null
  aceptadaEl: string | null
  venceTributosEl: string | null
  despachante: string | null
  deposito: string | null
  creadoEn: string
  actualizadoEn: string
  // Los que quien mira ve, acotado a 201 por la base (D9).
  vehiculos: number
  hayOcultos: boolean
  pagada: boolean
  faltan: number
}

export type VehiculoDeDeclaracion = {
  vehiculoId: string
  titulo: string
  origenId: string
  faseId: string | null
  fase: string | null
  agregadoEn: string
  // ¿Tiene un gasto vivo de tributos? Sólo un sí o no: ningún monto.
  tributo: boolean
}

export type DeclaracionLeida = Omit<FilaDeDeclaracion, 'vehiculos'> & {
  notas: string | null
  vehiculos: VehiculoDeDeclaracion[]
  // Hay más de los 200 que se devuelven.
  hayMas: boolean
}

const canal = z
  .string()
  .nullable()
  .transform((valor) => (esCanalDeAforo(valor) ? valor : null))

const esquemaDeFila = z.object({
  id: z.guid(),
  numero: z.string(),
  canal,
  aceptada_el: z.string().nullable(),
  vence_tributos_el: z.string().nullable(),
  despachante: z.string().nullable(),
  deposito: z.string().nullable(),
  creado_en: z.string(),
  actualizado_en: z.string(),
  vehiculos: z.number(),
  hay_ocultos: z.boolean(),
  pagada: z.boolean(),
  faltan: z.number(),
})

const esquemaDeVehiculo = z.object({
  vehiculo_id: z.guid(),
  titulo: z.string(),
  origen_id: z.guid(),
  fase_id: z.guid().nullable(),
  fase: z.string().nullable(),
  agregado_en: z.string(),
  tributo: z.boolean(),
})

const esquemaDeLeida = esquemaDeFila.omit({ vehiculos: true }).extend({
  notas: z.string().nullable(),
  vehiculos: z.array(esquemaDeVehiculo),
  hay_mas: z.boolean(),
})

/** Lo que devolvió `declaraciones_listar()` como filas; nulo si alguna no tiene la forma esperada (la infra lo vuelve un error: nunca se descarta en silencio). */
export function filasDeDeclaracionDesde(datos: unknown): FilaDeDeclaracion[] | null {
  const leido = z.array(esquemaDeFila).safeParse(datos)
  if (!leido.success) {
    return null
  }
  return leido.data.map((d) => ({
    id: d.id,
    numero: d.numero,
    canal: d.canal,
    aceptadaEl: d.aceptada_el,
    venceTributosEl: d.vence_tributos_el,
    despachante: d.despachante,
    deposito: d.deposito,
    creadoEn: d.creado_en,
    actualizadoEn: d.actualizado_en,
    vehiculos: d.vehiculos,
    hayOcultos: d.hay_ocultos,
    pagada: d.pagada,
    faltan: d.faltan,
  }))
}

/** Lo que devolvió `declaracion_leer()`; nulo si no tiene la forma esperada. `actualizadoEn` es la versión que las escrituras mandan de vuelta. */
export function declaracionDesde(datos: unknown): DeclaracionLeida | null {
  const leido = esquemaDeLeida.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const d = leido.data
  return {
    id: d.id,
    numero: d.numero,
    canal: d.canal,
    aceptadaEl: d.aceptada_el,
    venceTributosEl: d.vence_tributos_el,
    despachante: d.despachante,
    deposito: d.deposito,
    creadoEn: d.creado_en,
    actualizadoEn: d.actualizado_en,
    notas: d.notas,
    hayOcultos: d.hay_ocultos,
    pagada: d.pagada,
    faltan: d.faltan,
    hayMas: d.hay_mas,
    vehiculos: d.vehiculos.map((v) => ({
      vehiculoId: v.vehiculo_id,
      titulo: v.titulo,
      origenId: v.origen_id,
      faseId: v.fase_id,
      fase: v.fase,
      agregadoEn: v.agregado_en,
      tributo: v.tributo,
    })),
  }
}
