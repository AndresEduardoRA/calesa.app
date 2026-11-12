import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  TOPE_DE_FUERA_DE_REGLA,
  unidadesFueraDeReglaDesde,
} from '../../entities/requisitos/fuera-de-regla'
import type { LectorDeFueraDeRegla } from '../../entities/requisitos/repositorios'

const NO_SE_LEYO = 'No pudimos revisar las unidades fuera de regla.'

// `flujo_fuera_de_regla` (`…20261111222248_requisitos_fuera_de_regla.sql`): las unidades ya en una fase con requisitos bloqueantes que no los cumplen, por orden
// de fase y con `tope + 1` filas para saber si hay más. Sólo ids: los títulos salen aparte, con la RLS de quien mira. `42501` a quien no configura el flujo.
export const leerFueraDeRegla: LectorDeFueraDeRegla = async ({ flujoId }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('flujo_fuera_de_regla', {
    p_flujo: flujoId,
    p_tope: TOPE_DE_FUERA_DE_REGLA,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const unidades = unidadesFueraDeReglaDesde(data)
  if (unidades === null) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const cortadas = cortarAlTope(unidades, TOPE_DE_FUERA_DE_REGLA)
  return ok({ unidades: cortadas.filas, hayMas: cortadas.hayMas })
}
