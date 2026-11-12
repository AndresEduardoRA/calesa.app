// Las notas de una unidad (6.04-2): lo que el hueco «Notas» lee y lo que deja hacer con cada una. Sin I/O.
import { z } from 'zod'

export const LARGO_MAXIMO_DE_UNA_NOTA = 2000

export type NotaDeLaUnidad = {
  id: string
  cuerpo: string
  // El nombre de quien la escribió; nulo si no se pudo leer.
  autor: string | null
  // ¿La escribió quien mira? Sale del `sub` de su sesión.
  mia: boolean
  creadoEn: string
  actualizadoEn: string
  // Una nota que nació de un cambio de fase (la escribe `cambiar_fase`): dice a qué fase se pasó.
  deCambioDeFase: { haciaFase: string | null } | null
}

export const esquemaDelCuerpoDeLaNota = z
  .string()
  .trim()
  .min(1, { error: 'Escribe la nota.' })
  .max(LARGO_MAXIMO_DE_UNA_NOTA, {
    error: `La nota admite hasta ${String(LARGO_MAXIMO_DE_UNA_NOTA)} caracteres.`,
  })

/** El texto que dice de dónde nació una nota de cambio de fase. */
export function textoDelOrigenDeLaNota(
  nota: Pick<NotaDeLaUnidad, 'deCambioDeFase'>,
): string | null {
  if (nota.deCambioDeFase === null) return null
  const fase = nota.deCambioDeFase.haciaFase
  return fase === null ? 'al pasar de fase' : `al pasar a «${fase}»`
}

/** Editar y borrar son de quien la escribió, y nunca de una nota que dejó un cambio de fase (D9, D22). */
export function quePuedeHacerConLaNota(nota: Pick<NotaDeLaUnidad, 'mia' | 'deCambioDeFase'>): {
  editar: boolean
  borrar: boolean
} {
  const propia = nota.mia && nota.deCambioDeFase === null
  return { editar: propia, borrar: propia }
}

/** Cuántos caracteres le quedan a lo que se escribe (negativo si se pasó). */
export function restantesDeLaNota(texto: string): number {
  return LARGO_MAXIMO_DE_UNA_NOTA - texto.trim().length
}

// Lo que leen las consultas del navegador, con los embebidos de nombre.
const esquemaDelNombre = z.object({ nombre: z.string().nullable() }).nullable()
export const esquemaDeLaFilaDeNota = z.object({
  id: z.guid(),
  cuerpo: z.string(),
  autor_id: z.guid(),
  historial_fase_id: z.guid().nullable(),
  creado_en: z.string().min(10),
  actualizado_en: z.string().min(10),
  autor: esquemaDelNombre,
  historial: z.object({ a: esquemaDelNombre }).nullable(),
})

/** Una fila de la base en la forma del hueco, o nulo si no es lo que promete. */
export function notasDesde(crudo: unknown, yo: string | null): NotaDeLaUnidad[] | null {
  const leidas = z.array(esquemaDeLaFilaDeNota).safeParse(crudo)
  if (!leidas.success) return null
  return leidas.data.map((fila) => ({
    id: fila.id,
    cuerpo: fila.cuerpo,
    autor: fila.autor?.nombre ?? null,
    mia: yo !== null && fila.autor_id === yo,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
    deCambioDeFase:
      fila.historial_fase_id === null ? null : { haciaFase: fila.historial?.a?.nombre ?? null },
  }))
}
