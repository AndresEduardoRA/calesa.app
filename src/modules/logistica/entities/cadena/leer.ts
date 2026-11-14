import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { esquemaDeSituacionDeLaUnidad, type SituacionDeLaUnidad } from '../nucleo/situacion'

// Lo que devuelven `logistica_cadena()`, `logistica_cadena_columna()` y `logistica_donde_esta()` (6.02), validado con Zod en el borde (ids con `z.guid()`, fechas como texto ISO): su
// `Returns` es `Json`. Una forma que no es la esperada es un error visible, nunca una columna cortada ni una tarjeta a medias.

export type TarjetaDeLaCadena = {
  id: string
  // La identidad del vehículo «<principal> · <título>» (6.13); mientras no se arma, es el título (la infra la reemplaza).
  nombre: string
  titulo: string
  vin: string | null
  lote: string | null
  faseDesde: string | null
  // La situación real (la calcula la base): la tarjeta dice «En subasta» o «Sin resolver»; una no ganada no llega (no cuenta).
  situacion: SituacionDeLaUnidad
  // Lo calculó la base con los días de la fase y la regla `alerta_demora`: la interfaz no lo recalcula.
  demorada: boolean
  contenedor: string | null
  booking: string | null
  etaEl: string | null
}

export type ColumnaDeLaCadena = {
  // Nulo: la columna «Sin fase» (la pone la base; el texto, la interfaz).
  faseId: string | null
  nombre: string | null
  color: string | null
  // Nulo sólo en «Sin fase».
  activa: boolean | null
  esFinal: boolean
  demoraDias: number | null
  tarjetas: TarjetaDeLaCadena[]
  hayMas: boolean
}

export type CadenaLeida = { columnas: ColumnaDeLaCadena[] }

export type PaginaDeLaColumna = { tarjetas: TarjetaDeLaCadena[]; hayMas: boolean }

export type UnidadDondeEsta = {
  id: string
  origenId: string
  titulo: string
  vin: string | null
  lote: string | null
  faseId: string | null
  faseNombre: string | null
  faseColor: string | null
  faseDesde: string | null
  etaEl: string | null
}

export type ResultadoDeDondeEsta = { unidades: UnidadDondeEsta[]; hayMas: boolean }

const esquemaDeTarjeta = z.object({
  id: z.guid(),
  titulo: z.string(),
  vin: z.string().nullable(),
  lote: z.string().nullable(),
  fase_desde: z.string().nullable(),
  situacion: esquemaDeSituacionDeLaUnidad,
  demorada: z.boolean(),
  contenedor: z.string().nullable(),
  booking: z.string().nullable(),
  eta_el: z.string().nullable(),
})

const esquemaDeColumna = z.object({
  fase_id: z.guid().nullable(),
  nombre: z.string().nullable(),
  color: z.string().nullable(),
  activa: z.boolean().nullable(),
  es_final: z.boolean(),
  demora_dias: z.number().nullable(),
  tarjetas: z.array(esquemaDeTarjeta),
  hay_mas: z.boolean(),
})

const esquemaDeLaCadena = z.object({ columnas: z.array(esquemaDeColumna) })
const esquemaDeLaPagina = z.object({ tarjetas: z.array(esquemaDeTarjeta), hay_mas: z.boolean() })

const esquemaDeDondeEsta = z.object({
  unidades: z.array(
    z.object({
      id: z.guid(),
      origen_id: z.guid(),
      titulo: z.string(),
      vin: z.string().nullable(),
      lote: z.string().nullable(),
      fase_id: z.guid().nullable(),
      fase_nombre: z.string().nullable(),
      fase_color: z.string().nullable(),
      fase_desde: z.string().nullable(),
      eta_el: z.string().nullable(),
    }),
  ),
  hay_mas: z.boolean(),
})

function tarjetaDe(fila: z.infer<typeof esquemaDeTarjeta>): TarjetaDeLaCadena {
  return {
    id: fila.id,
    nombre: fila.titulo,
    titulo: fila.titulo,
    vin: fila.vin,
    lote: fila.lote,
    faseDesde: fila.fase_desde,
    situacion: fila.situacion,
    demorada: fila.demorada,
    contenedor: fila.contenedor,
    booking: fila.booking,
    etaEl: fila.eta_el,
  }
}

/** La cadena que devolvió `logistica_cadena()`; `inesperado` si alguna columna o tarjeta no tiene la forma esperada. */
export function cadenaDesde(datos: unknown): Resultado<CadenaLeida> {
  const leida = esquemaDeLaCadena.safeParse(datos)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok({
    columnas: leida.data.columnas.map((c) => ({
      faseId: c.fase_id,
      nombre: c.nombre,
      color: c.color,
      activa: c.activa,
      esFinal: c.es_final,
      demoraDias: c.demora_dias,
      tarjetas: c.tarjetas.map(tarjetaDe),
      hayMas: c.hay_mas,
    })),
  })
}

/** La página que devolvió `logistica_cadena_columna()`. */
export function paginaDeLaColumnaDesde(datos: unknown): Resultado<PaginaDeLaColumna> {
  const leida = esquemaDeLaPagina.safeParse(datos)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok({ tarjetas: leida.data.tarjetas.map(tarjetaDe), hayMas: leida.data.hay_mas })
}

/** Lo que devolvió `logistica_donde_esta()`. */
export function dondeEstaDesde(datos: unknown): Resultado<ResultadoDeDondeEsta> {
  const leida = esquemaDeDondeEsta.safeParse(datos)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok({
    unidades: leida.data.unidades.map((u) => ({
      id: u.id,
      origenId: u.origen_id,
      titulo: u.titulo,
      vin: u.vin,
      lote: u.lote,
      faseId: u.fase_id,
      faseNombre: u.fase_nombre,
      faseColor: u.fase_color,
      faseDesde: u.fase_desde,
      etaEl: u.eta_el,
    })),
    hayMas: leida.data.hay_mas,
  })
}
