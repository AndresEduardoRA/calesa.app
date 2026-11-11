import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeMisTareas } from '../../entities/mis-tareas'

// Mis tareas pendientes (soy el responsable; la RLS deja ver también las que di y, con `agenda.ver_todo`, todas: por eso el filtro), las que vencen primero
// arriba y las sin fecha al final (el orden de `tareas_responsable_idx (responsable_id, vence_en) where eliminado_en is null`: nulos al final). Pide `tope + 1`.
export const getMisTareas: LectorDeMisTareas = async ({ tope }) => {
  const supabase = await createClient()
  // `getClaims()` verifica la firma del JWT; `getSession()` confiaría en la cookie sin verificarla.
  const { data: sesion } = await supabase.auth.getClaims()
  const yo = sesion?.claims.sub
  if (!yo) {
    return ok({ filas: [], hayMas: false })
  }
  const { data, error } = await supabase
    .from('tareas')
    .select('id, titulo, vence_en')
    .eq('responsable_id', yo)
    .eq('estado', 'pendiente')
    .is('eliminado_en', null)
    .order('vence_en', { ascending: true, nullsFirst: false })
    .order('id')
    .limit(tope + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(
    cortarAlTope(
      data.map((fila) => ({ id: fila.id, titulo: fila.titulo, venceEn: fila.vence_en })),
      tope,
    ),
  )
}
