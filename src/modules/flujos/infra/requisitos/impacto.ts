import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_IMPACTO, impactoDesde } from '../../entities/requisitos/impacto'
import type { LectorDeImpactoDeRequisito } from '../../entities/requisitos/repositorios'

const NO_SE_LEYO =
  'No pudimos calcular cuántas unidades quedarían fuera de regla. Vuelve a intentar.'

// `requisito_impacto`: mira el requisito como si ya fuera bloqueante y cuenta, a lo sumo `TOPE_DE_IMPACTO + 1`,
// las unidades de su fase que no lo cumplen (por `vehiculos_fase_id_idx`, sobre una muestra de ≤ 1.000). `42501` a quien no configura el flujo; `PT409` si el
// requisito ya no existe.
export const leerImpactoDeRequisito: LectorDeImpactoDeRequisito = async ({ requisitoId }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('requisito_impacto', {
    p_requisito: requisitoId,
    p_tope: TOPE_DE_IMPACTO,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const impacto = impactoDesde(data)
  return impacto === null ? fallo('inesperado', NO_SE_LEYO) : ok(impacto)
}
