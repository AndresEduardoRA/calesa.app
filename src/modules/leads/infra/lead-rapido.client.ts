// Lectura del drawer rápido, en el navegador: un lead por su id, con la sesión de quien mira. La
// RLS de `leads` y `leads_vista` deciden qué llega (el teléfono enmascarado, los privados ajenos
// recortados); acá no se decide nada. Va por el navegador para poder releerlo al volver a la
// pestaña sin pedirle otra página entera al servidor.
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { COLUMNAS_DEL_LEAD_COMPLETO, leadCompletoDesde } from '../entities/listado'
import type { LectorDeLeadRapido } from '../entities/repositorios'

export const leerLeadRapido: LectorDeLeadRapido = async (id) => {
  const { data, error } = await createClient()
    .from('leads_vista')
    .select(COLUMNAS_DEL_LEAD_COMPLETO)
    .eq('id', id)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(leadCompletoDesde(data[0]))
}
