// El hilo de una conversación, leído en el navegador (7.09-3, D23): la primera página al montar, «Ver anteriores», «Ir a una fecha» y la
// relectura tras una señal. La fila de Realtime nunca se pinta; todo pasa por la RLS de `mensajes: leer` (es_miembro).
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import { POR_ALTA } from '@/shared/lib/paginacion'
import { leerMensajes } from '../entities/mensajes'
import type { LectorDeMensajes } from '../entities/repositorios'

// Sin el embed `responde`: `mensajes → mensajes` es una relación sobre sí misma y PostgREST la resuelve en el sentido contrario (un arreglo de
// respuestas) o la rechaza por ambigua. La cita se lee aparte, por clave primaria.
const COLUMNAS_DEL_HILO =
  'id, conversacion_id, autor_id, tipo, cuerpo, creado_en, editado_en, eliminado_en, responde_a_id, vehiculo_id, lead_id, cotizacion_id, tarea_id, evento_id, autor:perfiles!mensajes_autor_id_fkey(nombre)'
const COLUMNAS_DE_LA_CITA =
  'id, cuerpo, eliminado_en, autor:perfiles!mensajes_autor_id_fkey(nombre)'

type FilaDelHilo = { responde_a_id: string | null }

// Los originales de los mensajes que responden (a lo sumo una página: `tamano + 1`), por `mensajes_pkey`. Si la lectura falla o la RLS no deja
// ver uno, el mensaje queda sin cita y la burbuja dice «Mensaje no disponible»: el hilo no se cae por una cita.
async function conSusCitas(filas: readonly FilaDelHilo[]): Promise<unknown[]> {
  const ids = [...new Set(filas.flatMap((f) => (f.responde_a_id ? [f.responde_a_id] : [])))]
  if (ids.length === 0) {
    return [...filas]
  }
  const { data } = await createClient()
    .from('mensajes')
    .select(COLUMNAS_DE_LA_CITA)
    .in('id', ids)
    .limit(ids.length)
  const porId = new Map((data ?? []).map((cita) => [cita.id, cita]))
  return filas.map((f) => ({
    ...f,
    responde: f.responde_a_id ? (porId.get(f.responde_a_id) ?? null) : null,
  }))
}

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
  return leerMensajes(await conSusCitas(data), tamano)
}
