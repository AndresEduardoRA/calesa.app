import 'server-only'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { impactoDesde } from '../../entities/reglas/impacto'
import type {
  FalloDeReglas,
  RepositorioDeReglas,
  ResultadoDeReglas,
} from '../../entities/reglas/repositorios'

// Las tres RPC de 5.10 (`flujo_regla_impacto`, `flujo_regla_cambiar`, `flujo_oferta_guardar`): el permiso del flujo (`42501`), la versión (`PT409`),
// apagar con uso o la oferta sin «Transporte» (`23514`), un puerto que ya no existe (`23503`) y la forma (`22023`). El `hint` viaja como campo.
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type ErrorDeRpc = { code?: string | null; message: string; hint?: string | null }

function comoFallo(error: ErrorDeRpc): FalloDeReglas {
  const campo = error.hint ?? undefined
  return { ok: false, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

// La versión nueva del flujo: texto ISO tal cual, nunca `Date`.
function comoVersion(salida: {
  data: unknown
  error: ErrorDeRpc | null
}): ResultadoDeReglas<string> {
  if (salida.error) {
    return comoFallo(salida.error)
  }
  return typeof salida.data === 'string' && salida.data !== ''
    ? { ok: true, data: salida.data }
    : fallo('inesperado', NO_SE_LEYO)
}

export const reglasSupabase: RepositorioDeReglas = {
  impacto: async ({ flujoId, regla }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('flujo_regla_impacto', {
      p_flujo: flujoId,
      p_regla: regla,
    })
    if (error) {
      return comoFallo(error)
    }
    const impacto = impactoDesde(data)
    return impacto ? { ok: true, data: impacto } : fallo('inesperado', NO_SE_LEYO)
  },
  cambiar: async ({ flujoId, version, regla, activa }) => {
    const supabase = await createClient()
    return comoVersion(
      await supabase.rpc('flujo_regla_cambiar', {
        p_flujo: flujoId,
        p_actualizado_en_esperado: version,
        p_regla: regla,
        p_activa: activa,
      }),
    )
  },
  guardarOferta: async ({ flujoId, version, puertosOrigen, puertosDestino, navieras }) => {
    const supabase = await createClient()
    return comoVersion(
      await supabase.rpc('flujo_oferta_guardar', {
        p_flujo: flujoId,
        p_actualizado_en_esperado: version,
        p_puertos_origen: puertosOrigen,
        p_puertos_destino: puertosDestino,
        p_navieras: navieras,
      }),
    )
  },
}
