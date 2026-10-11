import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { origenesDesde, type OrigenResumen } from '../../entities/origen'

// Los orígenes activos, en el orden que eligió la empresa. Una lectura por request.
export const getOrigenes = cache(async (): Promise<Resultado<OrigenResumen[]>> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('origenes')
    .select('id, nombre, color')
    .eq('activo', true)
    .order('orden')
    .order('nombre')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(origenesDesde(data))
})
