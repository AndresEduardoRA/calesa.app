import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDelTablero } from '../../entities/cola/repositorios'
import { tableroDesde } from '../../entities/cola/tablero'

// Todas las habilitadas de la cola web, con su grupo y sus números (8.04-2). `cola_web_tablero` es de definidor y exige `web.cola.gestionar`: sin la clave,
// 42501. `cola_web_asesores` es de configuración (a lo sumo el equipo, `TOPE_DEL_EQUIPO`); las abiertas van por `solicitudes_web_asesor_abiertas_idx`.
export const leerTablero: LectorDelTablero = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cola_web_tablero', { p_tope: TOPE_DEL_EQUIPO })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const tablero = tableroDesde(data)
  return tablero ? ok(tablero) : fallo('inesperado', 'No pudimos leer la cola.')
}
