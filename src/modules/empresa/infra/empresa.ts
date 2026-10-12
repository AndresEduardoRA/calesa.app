import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { cambiosComoColumnas } from '../entities/ajustes-empresa'
import type { RepositorioEmpresa } from '../entities/repositorios'

// Los ajustes se escriben sólo por `empresa_guardar_ajustes()`: ahí viven el permiso, el control
// de versión (`PT409`), el sello de quién cambió y la guarda de la moneda base.
const guardar: RepositorioEmpresa['guardar'] = async ({ cambios, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('empresa_guardar_ajustes', {
    p_cambios: cambiosComoColumnas(cambios),
    p_actualizado_en_esperado: actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

export const empresaSupabase: RepositorioEmpresa = { guardar }
