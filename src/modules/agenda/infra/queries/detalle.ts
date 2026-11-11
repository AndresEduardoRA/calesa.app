import 'server-only'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  detalleDeEventoDesde,
  detalleDeTareaDesde,
  type LectorDeEvento,
  type LectorDeTarea,
} from '../../entities/detalle'
import { TOPE_DE_DESTINATARIOS } from '../../entities/visibilidad'

const COLUMNAS_DE_EVENTO =
  'id, titulo, descripcion, lugar, inicia_en, termina_en, visibilidad, estado, creado_por, actualizado_en, lead_id, vehiculo_id, cotizacion_id'
const COLUMNAS_DE_TAREA =
  'id, titulo, descripcion, vence_en, estado, completada_en, responsable_id, creado_por, actualizado_en, lead_id, vehiculo_id, cotizacion_id'

// Los nombres de unas pocas personas en una sola consulta (`perfiles_pkey`): `perfiles: leer` deja leer a toda persona activa.
async function nombresDe(ids: readonly string[]): Promise<Resultado<Record<string, string>>> {
  const unicos = [...new Set(ids)]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .in('id', unicos)
    .limit(unicos.length + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(Object.fromEntries(data.map((fila) => [fila.id, fila.nombre])))
}

// Un evento por su id, bajo la RLS de quien mira (`eventos_pkey`): lo que no ve, no existe o está eliminado vuelve nulo. Sus destinatarios sólo se
// leen si lo creó quien mira (`eventos_destinatarios_pkey`, a lo sumo 50); los nombres, en una consulta más. Tres llamadas como mucho, sin N+1.
export const getEvento: LectorDeEvento = async (id, yo) => {
  const supabase = await createClient()
  const { data: fila, error } = await supabase
    .from('eventos')
    .select(COLUMNAS_DE_EVENTO)
    .eq('id', id)
    .is('eliminado_en', null)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (!fila) {
    return ok(null)
  }
  let ids: string[] = []
  if (fila.creado_por === yo && fila.visibilidad === 'seleccionados') {
    const { data, error: errorDeDestinatarios } = await supabase
      .from('eventos_destinatarios')
      .select('usuario_id')
      .eq('evento_id', id)
      .limit(TOPE_DE_DESTINATARIOS + 1)
    if (errorDeDestinatarios) {
      return { ok: false, error: errorDePostgrest(errorDeDestinatarios) }
    }
    ids = data.map((destinatario) => destinatario.usuario_id)
  }
  const nombres = await nombresDe([fila.creado_por, ...ids])
  if (!nombres.ok) {
    return nombres
  }
  return ok(detalleDeEventoDesde(fila, nombres.data, ids, yo))
}

// Una tarea por su id, bajo la RLS (`tareas_pkey`) y los nombres de su responsable y su creador en una consulta (`perfiles_pkey`).
export const getTarea: LectorDeTarea = async (id) => {
  const supabase = await createClient()
  const { data: fila, error } = await supabase
    .from('tareas')
    .select(COLUMNAS_DE_TAREA)
    .eq('id', id)
    .is('eliminado_en', null)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (!fila) {
    return ok(null)
  }
  const nombres = await nombresDe([fila.responsable_id, fila.creado_por])
  if (!nombres.ok) {
    return nombres
  }
  return ok(detalleDeTareaDesde(fila, nombres.data))
}
