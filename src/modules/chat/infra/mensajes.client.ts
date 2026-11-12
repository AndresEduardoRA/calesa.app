// El hilo de una conversación, leído en el navegador (7.09-3, D23): la primera página al montar, «Ver anteriores», «Ir a una fecha» y la
// relectura tras una señal. La fila de Realtime nunca se pinta; todo pasa por la RLS de `mensajes: leer` (es_miembro).
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import { POR_ALTA } from '@/shared/lib/paginacion'
import { leerMensajes } from '../entities/mensajes'
import type { LectorDeMensajes } from '../entities/repositorios'

// Sin el embed `responde`: la cita de un mensaje respondido la suma 7.09-4 aquí mismo.
const COLUMNAS_DEL_HILO =
  'id, conversacion_id, autor_id, tipo, cuerpo, creado_en, editado_en, eliminado_en, responde_a_id, autor:perfiles!mensajes_autor_id_fkey(nombre)'

// Índice: `mensajes_hilo_idx (conversacion_id, creado_en desc, id desc)`. Se pide una fila de más (`tamano + 1`) para saber si hay más atrás.
export const leerPaginaDeMensajes: LectorDeMensajes = async ({
  conversacion,
  antes,
  hasta,
  tamano,
}) => {
  let consulta = createClient()
    .from('mensajes')
    .select(COLUMNAS_DEL_HILO)
    .eq('conversacion_id', conversacion)
  if (hasta) {
    consulta = consulta.lt('creado_en', hasta)
  }
  consulta = aplicarCursor(consulta, antes ?? null, POR_ALTA)
  const { data, error } = await ordenarPorCursor(consulta, antes ?? null, POR_ALTA).limit(
    tamano + 1,
  )
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return leerMensajes(data, tamano)
}
