import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeTiposDeSeguimientoConUso } from '../../entities/repositorios-de-tipos-de-seguimiento'
import { listaDeTiposDeSeguimientoDesde } from '../../entities/tipo-de-seguimiento'

// Para la pantalla de configuración: los tipos de seguimiento con su icono y si algún seguimiento usa cada uno (la RPC cuenta también los
// eliminados, que la RLS esconde), y el tope. Son a lo sumo 100 filas, con una sonda sobre `seguimientos_tipo_idx` cada una: nunca un
// conteo. Quien ofrece los tipos al anotar lee los activos (`getTiposDeSeguimiento`, también acotados por la base a su tope).
export const getTiposDeSeguimientoConUso: LectorDeTiposDeSeguimientoConUso = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('tipos_seguimiento_con_uso')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = listaDeTiposDeSeguimientoDesde(data)
  return lista
    ? ok(lista)
    : fallo(
        'inesperado',
        'No pudimos leer los tipos de seguimiento. Recarga para ver cómo quedaron.',
      )
}
