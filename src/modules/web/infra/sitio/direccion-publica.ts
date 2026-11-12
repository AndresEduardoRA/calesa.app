import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeDireccionPublica } from '../../entities/sitio/repositorios'

// La dirección pública de la web: la lee cualquier cuenta con sesión (`ajustes_web: leer`). La carga
// Configuración › Sitio web › Ajustes (8.01-4); mientras nadie la cargue, nula.
export const getDireccionPublica: LectorDeDireccionPublica = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_web')
    .select('direccion_publica')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data?.direccion_publica ?? null)
})
