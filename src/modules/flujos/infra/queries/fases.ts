import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { COLUMNAS_DE_FASE, fasesDesde } from '../../entities/fase'
import type { LectorDeFases } from '../../entities/repositorios'

// Cada origen tiene un solo flujo de vehículos (`flujos_origen_unico`). Cualquier cuenta lee las
// fases: las fichas y los filtros las nombran. Una lectura por origen y por request.
export const getFasesDeOrigen: LectorDeFases = cache(async (origenId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fases')
    .select(`${COLUMNAS_DE_FASE}, flujos!inner(origen_id, ambito)`)
    .eq('flujos.origen_id', origenId)
    .eq('flujos.ambito', 'vehiculos')
    .order('orden')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(fasesDesde(data))
})
