// El historial de fases de una unidad (6.04-2): una línea por cambio. Sin I/O.
import { z } from 'zod'

export type CambioDeFase = {
  // El `bigint` de la base; también es lo que desempata el cursor.
  id: number
  de: string | null
  a: string | null
  quien: string | null
  creadoEn: string
  nota: string | null
}

/** «Entró a «B»» si no venía de ninguna fase; si no, ««A» → «B»». */
export function lineaDelCambio(cambio: Pick<CambioDeFase, 'de' | 'a'>): string {
  const a = cambio.a === null ? 'sin fase' : `«${cambio.a}»`
  return cambio.de === null ? `Entró a ${a}` : `«${cambio.de}» → ${a}`
}

/** Quién lo hizo: sin persona, el sistema. */
export function quienHizoElCambio(cambio: Pick<CambioDeFase, 'quien'>): string {
  return cambio.quien ?? 'Sistema'
}

const esquemaDelNombre = z.object({ nombre: z.string().nullable() }).nullable()
const esquemaDeLaFilaDelCambio = z.object({
  id: z.number().int(),
  creado_en: z.string().min(10),
  nota: z.string().nullable(),
  de: esquemaDelNombre,
  a: esquemaDelNombre,
  quien: esquemaDelNombre,
})

/** Las filas de la base en la forma del hueco, o nulo si no son lo que promete. */
export function cambiosDesde(crudo: unknown): CambioDeFase[] | null {
  const leidas = z.array(esquemaDeLaFilaDelCambio).safeParse(crudo)
  if (!leidas.success) return null
  return leidas.data.map((fila) => ({
    id: fila.id,
    creadoEn: fila.creado_en,
    nota: fila.nota,
    de: fila.de?.nombre ?? null,
    a: fila.a?.nombre ?? null,
    quien: fila.quien?.nombre ?? null,
  }))
}
