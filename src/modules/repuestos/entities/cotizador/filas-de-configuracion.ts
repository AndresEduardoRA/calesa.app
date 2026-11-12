// Lo que se lee de la configuración del cotizador de repuestos (8.12-2, C4). Puro. Los decimales llegan como texto (`::text` en el `select`): el
// formulario recibe el valor exacto y `Number` sólo sirve para dibujar con `<Monto>` (D20).
import { z } from 'zod'

export const TOPE_DEL_HISTORIAL = 20
export const TOPE_DE_TRAMOS = 200
export const TOPE_DE_CAJAS = 200

export const COLUMNAS_DE_CONFIGURACION =
  'id, factor_importado::text, recargo_local::text, redondeo::text, vigente_desde'
export const COLUMNAS_DE_TRAMO = 'id, moneda, costo_min::text, costo_max::text, monto::text, activo'
export const COLUMNAS_DE_CAJA = 'id, moneda, monto::text, activa'

const decimal = z.string().regex(/^\d+(\.\d+)?$/)

const esquemaDeConfiguracion = z
  .object({
    id: z.number().int(),
    factor_importado: decimal,
    recargo_local: decimal,
    redondeo: decimal,
    vigente_desde: z.string(),
  })
  .transform((f) => ({
    id: f.id,
    factorImportado: f.factor_importado,
    recargoLocal: f.recargo_local,
    redondeo: f.redondeo,
    vigenteDesde: f.vigente_desde,
  }))

const esquemaDeTramo = z
  .object({
    id: z.guid(),
    moneda: z.string(),
    costo_min: decimal,
    costo_max: decimal.nullable(),
    monto: decimal,
    activo: z.boolean(),
  })
  .transform((f) => ({
    id: f.id,
    moneda: f.moneda.trim(),
    costoMin: f.costo_min,
    costoMax: f.costo_max,
    monto: f.monto,
    activo: f.activo,
  }))

const esquemaDeCaja = z
  .object({ id: z.guid(), moneda: z.string(), monto: decimal, activa: z.boolean() })
  .transform((f) => ({ id: f.id, moneda: f.moneda.trim(), monto: f.monto, activa: f.activa }))

/** Una configuración publicada; el recargo es la fracción (`'0.1000'`). */
export type ConfiguracionDelCotizador = z.output<typeof esquemaDeConfiguracion>
export type TramoConfigurado = z.output<typeof esquemaDeTramo>
export type CajaConfigurada = z.output<typeof esquemaDeCaja>

function lista<T extends z.ZodType>(esquema: T) {
  return (datos: unknown): z.output<T>[] | null => {
    const leido = z.array(esquema).safeParse(datos)
    return leido.success ? leido.data : null
  }
}

/** Las filas de cada tabla; nulo si alguna no tiene la forma esperada. */
export const configuracionesDesde = lista(esquemaDeConfiguracion)
export const tramosDesde = lista(esquemaDeTramo)
export const cajasDesde = lista(esquemaDeCaja)

export type LecturaDeLaConfiguracion = {
  vigente: ConfiguracionDelCotizador | null
  historial: ConfiguracionDelCotizador[]
  hayMasHistorial: boolean
  tramos: TramoConfigurado[]
  hayMasTramos: boolean
  cajas: CajaConfigurada[]
  hayMasCajas: boolean
}

export type GrupoDeMoneda = {
  moneda: string
  inactiva: boolean
  tramos: TramoConfigurado[]
  cajas: CajaConfigurada[]
}

/** Un grupo por moneda activa, en su orden, y después uno por cada moneda inactiva que todavía tenga tramos o cajas. */
export function agruparPorMoneda(
  activas: readonly string[],
  tramos: readonly TramoConfigurado[],
  cajas: readonly CajaConfigurada[],
): GrupoDeMoneda[] {
  const grupo = (moneda: string, inactiva: boolean): GrupoDeMoneda => ({
    moneda,
    inactiva,
    tramos: tramos.filter((t) => t.moneda === moneda),
    cajas: cajas.filter((c) => c.moneda === moneda),
  })
  const inactivas = [...new Set([...tramos, ...cajas].map((f) => f.moneda))].filter(
    (m) => !activas.includes(m),
  )
  return [...activas.map((m) => grupo(m, false)), ...inactivas.sort().map((m) => grupo(m, true))]
}
