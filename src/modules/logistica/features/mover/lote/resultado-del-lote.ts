// Lo que pasó con un lote movido, dicho entero (6.04-3): cuántas se movieron y, por cada una que no, su nombre y su motivo llano. Resultado parcial, no todo o nada. Puro, sin I/O.
import {
  motivoLegible,
  type FilaDelLote,
  type VistaPreviaDeUnaUnidad,
} from '@/modules/flujos/client'

export type ResumenDelLote = {
  titular: string
  fallidas: { vehiculoId: string; linea: string }[]
}

const SIN_NOMBRE = 'Una unidad'

/** «Se movieron 6 de 8.», «Se movió 1 de 1.», «No se movió ninguna.» */
export function titularDelLote(movidas: number, total: number): string {
  if (movidas === 0) return 'No se movió ninguna.'
  const verbo = movidas === 1 ? 'Se movió' : 'Se movieron'
  return `${verbo} ${String(movidas)} de ${String(total)}.`
}

/** El resumen: una línea por cada fallida, «No se movió «X». <motivo>». El conflicto trae el texto de la base con el nombre de quien movió. */
export function resumenDelLote(
  filas: readonly FilaDelLote[],
  nombres: ReadonlyMap<string, string>,
  vistas: readonly VistaPreviaDeUnaUnidad[] = [],
): ResumenDelLote {
  const faltasDe = new Map(vistas.map((v) => [v.vehiculoId, v.faltan]))
  const movidas = filas.filter((f) => f.ok).length
  return {
    titular: titularDelLote(movidas, filas.length),
    fallidas: filas
      .filter((f) => !f.ok)
      .map((f) => ({
        vehiculoId: f.vehiculoId,
        linea: `No se movió «${nombres.get(f.vehiculoId) ?? SIN_NOMBRE}». ${motivoLegible(
          { codigo: f.codigo, motivo: f.motivo },
          { faltan: faltasDe.get(f.vehiculoId) },
        )}`,
      })),
  }
}

/** Las que fallaron: lo que «Reintentar» vuelve a mirar. */
export function idsParaReintentar(filas: readonly FilaDelLote[]): string[] {
  return filas.filter((f) => !f.ok).map((f) => f.vehiculoId)
}
