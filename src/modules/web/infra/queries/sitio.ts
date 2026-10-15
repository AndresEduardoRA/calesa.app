import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeDireccionPublica } from '../../entities/repositorios'

// La dirección pública de la web: la lee cualquier cuenta con sesión (`ajustes_web: leer`). Sin
// pantalla para cargarla hasta Configuración › Sitio web (Fase 8): mientras, nula.
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
