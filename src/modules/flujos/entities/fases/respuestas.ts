// Lo que la base devuelve de las seis RPC de fases, leído con Zod en el borde. Una respuesta que no se entiende es `null` (el repositorio la dice
// como error), nunca un dato a medias.
import { z } from 'zod'
import { MOTIVOS_DE_IMPACTO, impactoDeFaseDesde, type ImpactoDeFase } from './vista-de-impacto'

// La versión nueva del flujo (`flujos.actualizado_en`, texto ISO tal cual, con sus microsegundos: nunca por un `Date`).
export type RespuestaDeFase = { version: string }

const versionCruda = z.string().min(1)

// `fase_crear`, `fase_guardar`, `fase_mover` y `fase_reactivar` devuelven la versión nueva y nada más.
export function respuestaDeFaseDesde(crudo: unknown): RespuestaDeFase | null {
  const v = versionCruda.safeParse(crudo)
  return v.success ? { version: v.data } : null
}

// `fase_eliminar`: sin uso borró; con unidades o historial jubiló. La base decide, no la pantalla.
export type RespuestaDeEliminarFase = { accion: 'jubilada' | 'eliminada'; version: string }

const eliminarCrudo = z.object({
  accion: z.enum(['jubilada', 'eliminada']),
  version: z.string().min(1),
})

export function respuestaDeEliminarFaseDesde(crudo: unknown): RespuestaDeEliminarFase | null {
  const r = eliminarCrudo.safeParse(crudo)
  return r.success ? r.data : null
}

const impactoCrudo = z.object({
  accion: z.enum(['jubilar', 'eliminar', 'bloqueada']),
  motivo: z.enum(MOTIVOS_DE_IMPACTO).nullable(),
  paradas: z.number().int().min(0),
  hay_historial: z.boolean(),
  esperas: z.number().int().min(0),
  unica_inicial: z.boolean(),
})

// `fase_impacto`: los conteos llegan con tope 50 + 1 y se acotan.
export function impactoDeFaseDeLaBase(crudo: unknown): ImpactoDeFase | null {
  const r = impactoCrudo.safeParse(crudo)
  if (!r.success) {
    return null
  }
  const i = r.data
  return impactoDeFaseDesde({
    accion: i.accion,
    motivo: i.motivo,
    paradas: i.paradas,
    hayHistorial: i.hay_historial,
    esperas: i.esperas,
    unicaInicial: i.unica_inicial,
  })
}
