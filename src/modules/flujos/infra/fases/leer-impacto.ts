import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeImpactoDeFase } from '../../entities/fases/repositorios'
import { impactoDeFaseDeLaBase } from '../../entities/fases/respuestas'

// `fase_impacto(p_fase)`: lo que usa la fase y qué haría jubilarla o eliminarla, con conteos de tope 50 + 1.
// Sin versión ni candado. Sólo la ve quien configura el flujo (`42501`); una fase que ya no existe da `PT409`.
export const leerImpactoDeFaseSupabase: LectorDeImpactoDeFase = async (faseId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('fase_impacto', { p_fase: faseId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const impacto = impactoDeFaseDeLaBase(data)
  return impacto
    ? ok(impacto)
    : fallo('inesperado', 'No pudimos leer qué usa la fase. Vuelve a intentar.')
}
