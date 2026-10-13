import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeVistas } from '../../entities/repositorios-vistas'
import { vistasDesde } from '../../entities/vista'

// Sólo las propias: la policy de `vistas_guardadas` es de fila propia. Una lectura por request.
export const getVistas: LectorDeVistas = cache(async (pantalla) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vistas_guardadas')
    .select('id, nombre, params, orden')
    .eq('pantalla', pantalla)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vistasDesde(data))
})
