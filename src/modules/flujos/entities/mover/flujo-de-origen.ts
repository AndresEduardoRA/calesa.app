// El flujo de un origen visto desde logística (6.01): sus reglas activas (`flujos_reglas`) y, por fase, lo que decide cómo se mueve una unidad
// (`nota_obligatoria`, `permite_contenedor`, `permite_aduana`, `demora_dias`). Sólo lectura. La fila de la base se valida con Zod en el borde
// (ids con `z.guid()`); una fila inválida o una lista que llegó al tope es un error visible, nunca una lista cortada en silencio.
import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_FASES, TOPE_DE_REGLAS } from '../flujo'

export type FaseParaMover = {
  id: string
  activa: boolean
  esLogistica: boolean
  notaObligatoria: boolean
  permiteContenedor: boolean
  permiteAduana: boolean
  demoraDias: number | null
}

export type FlujoDeOrigen = {
  flujoId: string
  // Los nombres de las reglas de `flujos_reglas` que están activas (`transporte`, `aduana`, `gastos`…).
  reglasActivas: string[]
  fases: FaseParaMover[]
}

/** Lo que se pide a PostgREST: el flujo con sus reglas y sus fases incrustadas (cada una pide `tope + 1`). */
export const COLUMNAS_DE_FLUJO_DE_ORIGEN =
  'id, flujos_reglas(regla, activa), fases(id, activa, es_logistica, nota_obligatoria, permite_contenedor, permite_aduana, demora_dias)'

const esquemaDeFila = z.object({
  id: z.guid(),
  flujos_reglas: z.array(z.object({ regla: z.string(), activa: z.boolean() })),
  fases: z.array(
    z.object({
      id: z.guid(),
      activa: z.boolean(),
      es_logistica: z.boolean(),
      nota_obligatoria: z.boolean(),
      permite_contenedor: z.boolean(),
      permite_aduana: z.boolean(),
      demora_dias: z.number().nullable(),
    }),
  ),
})

/** La fila del flujo del origen (o `null` si no tiene flujo de vehículos) como `FlujoDeOrigen`, o el error si no se puede confiar en ella. */
export function flujoDeOrigenDesde(fila: unknown): Resultado<FlujoDeOrigen | null> {
  if (fila === null) return ok(null)
  const leida = esquemaDeFila.safeParse(fila)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const { id, flujos_reglas, fases } = leida.data
  if (flujos_reglas.length > TOPE_DE_REGLAS || fases.length > TOPE_DE_FASES) {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
  return ok({
    flujoId: id,
    reglasActivas: flujos_reglas.filter((r) => r.activa).map((r) => r.regla),
    fases: fases.map((f) => ({
      id: f.id,
      activa: f.activa,
      esLogistica: f.es_logistica,
      notaObligatoria: f.nota_obligatoria,
      permiteContenedor: f.permite_contenedor,
      permiteAduana: f.permite_aduana,
      demoraDias: f.demora_dias,
    })),
  })
}

/** ¿Está activa la regla en el flujo? Falsa si no figura. */
export function reglaActiva(flujo: Pick<FlujoDeOrigen, 'reglasActivas'>, regla: string): boolean {
  return flujo.reglasActivas.includes(regla)
}
