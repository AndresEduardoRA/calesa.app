import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { EscritorDeLaRueda } from '../../entities/cola/repositorios'

// Habilitar o quitar a alguien de la rueda (8.04-3). `cola_web_configurar` es de definidor y repite el permiso (`assert_permiso('web.cola.gestionar')`);
// pisa habilitado, cupo, prioridad y orden, y nunca toca `disponible` (lo maneja cada asesor). Un cupo nulo se manda omitiendo la clave: su defecto es
// nulo (hereda la política). Al habilitar, `puede_estar_en_la_rueda` dice si su rol recibe turnos (8-1).
export const configurarEnLaRueda: EscritorDeLaRueda = async ({
  usuarioId,
  habilitado,
  maxAbiertas,
  prioridad,
  orden,
}) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('cola_web_configurar', {
    p_usuario: usuarioId,
    p_habilitado: habilitado,
    p_prioridad: prioridad,
    p_orden: orden,
    ...(maxAbiertas === null ? {} : { p_max_abiertas: maxAbiertas }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (!habilitado) {
    return ok({ enLaRueda: false })
  }
  const relectura = await supabase.rpc('puede_estar_en_la_rueda', { p_usuario: usuarioId })
  // Si la relectura falla, el guardado ya ocurrió: no se dice un error, sólo que no se sabe.
  return ok({ enLaRueda: relectura.error ? null : relectura.data === true })
}
