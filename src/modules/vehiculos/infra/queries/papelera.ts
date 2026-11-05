import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { PRIMEROS_DEL_LOTE, armarPagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { limpiezaPendienteDesde, lotesDesde } from '../../entities/papelera'
import type {
  ConsultaDePermiso,
  LectorDeLimpiezaPendiente,
  LectorDePapelera,
} from '../../entities/repositorios'

// Los lotes que todavía tienen algo adentro. La RLS esconde lo eliminado a todos: la papelera
// sólo se lee por esta RPC, que da lo propio o, con `vehiculos.papelera.purgar`, todo.
export const getPapelera: LectorDePapelera = async ({ cursor, tamano }) => {
  const supabase = await createClient()
  // Por keyset `(creado_en, id)` con `lotes_papelera_tipo_idx`; `tamano + 1` para saber si hay otra. De cada lote, los
  // primeros `PRIMEROS_DEL_LOTE` y cuántos quedan (cierre 1).
  const { data, error } = await supabase.rpc('vehiculos_papelera_listar', {
    ...(cursor ? { p_antes_en: cursor.instante, p_antes_id: cursor.id } : {}),
    p_hacia_atras: cursor?.sentido === 'anterior',
    p_tope: tamano + 1,
    p_primeros: PRIMEROS_DEL_LOTE,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(armarPagina(lotesDesde(data), tamano, cursor))
}

// De estos vehículos, sobre cuáles tiene quien llama este permiso. Lo responde la base con la
// regla de sus RPC (`puede_vehiculo`), acotado a los ids que se le pasan.
export const getConPermiso: ConsultaDePermiso = async (ids, clave) => {
  if (ids.length === 0) {
    return ok([])
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculos_con_permiso', {
    p_ids: [...ids],
    p_clave: clave,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(z.array(z.guid()).parse(data))
}

// Cuánto lleva esperando lo que ya debía haberse borrado de Storage. Nulo si no hay nada, o si
// quien pregunta no puede vaciar la papelera.
export const getLimpiezaPendiente: LectorDeLimpiezaPendiente = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('storage_gc_pendiente')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(limpiezaPendienteDesde(data))
}
