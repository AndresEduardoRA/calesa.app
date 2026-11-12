// El historial de movimientos de stock de un ítem (8.10-2, C4). Puro. Se lee de a `TAMANO_DE_VER_MAS` por `id desc` (identity: el orden en que se registraron) con el
// `id` de la última como cursor; la lectura pide uno de más para saber si hay otra página. Un motivo que no está en la lista (filas viejas, D4 de 8.10-1) se muestra tal cual.
import { z } from 'zod'
import { esMotivoDeStock, TEXTO_DEL_MOTIVO } from './motivos'

export type MovimientoDeStock = {
  id: number
  // Con signo: positiva entra, negativa sale.
  cantidad: number
  motivo: string
  nota: string | null
  // ISO.
  creadoEn: string
  // El nombre de quien lo movió; nulo si ya no se sabe.
  quien: string | null
}

export type PaginaDeMovimientos = { movimientos: MovimientoDeStock[]; siguiente: number | null }

export const COLUMNAS_DE_MOVIMIENTO =
  'id, cantidad, motivo, nota, creado_en, quien:perfiles!repuestos_stock_movimientos_usuario_id_fkey(nombre)'

const esquemaDeMovimiento = z.object({
  id: z.number().int(),
  cantidad: z.number().int(),
  motivo: z.string(),
  nota: z.string().nullable(),
  creado_en: z.string(),
  quien: z.object({ nombre: z.string() }).nullable(),
})

/** Las filas leídas; nulo si alguna no tiene la forma esperada. */
export function movimientosDesde(datos: unknown): MovimientoDeStock[] | null {
  const leido = z.array(esquemaDeMovimiento).safeParse(datos)
  if (!leido.success) return null
  return leido.data.map((m) => ({
    id: m.id,
    cantidad: m.cantidad,
    motivo: m.motivo,
    nota: m.nota,
    creadoEn: m.creado_en,
    quien: m.quien?.nombre ?? null,
  }))
}

/** Hasta `tamano` movimientos y el cursor de la página siguiente, si se leyó uno de más. */
export function paginaDeMovimientos(
  filas: readonly MovimientoDeStock[],
  tamano: number,
): PaginaDeMovimientos {
  const movimientos = filas.slice(0, tamano)
  const hayMas = filas.length > tamano
  return { movimientos, siguiente: hayMas ? (movimientos.at(-1)?.id ?? null) : null }
}

/** Lo que dice el historial del motivo. */
export function textoDelMovimiento(motivo: string): string {
  return esMotivoDeStock(motivo) ? TEXTO_DEL_MOTIVO[motivo] : motivo
}

/** `+2` o `−1` (signo menos tipográfico). */
export function cantidadConSigno(cantidad: number): string {
  return cantidad > 0 ? `+${String(cantidad)}` : `−${String(Math.abs(cantidad))}`
}
