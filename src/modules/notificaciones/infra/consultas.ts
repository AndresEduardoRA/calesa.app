// Las consultas de la campana y de `/notificaciones`, escritas una vez para el servidor (primera página) y el
// navegador («Ver más», el contador y la campana). Las dos pasan por la RLS: cada quien lee sólo sus avisos.
import type { SupabaseClient } from '@supabase/supabase-js'
import { type Resultado, errorDePostgrest, ok } from '@/shared/lib/errores'
import { type ConteoAcotado, conteoAcotado, cortarAlTope } from '@/shared/lib/conteo'
import type { Database } from '@/shared/types/database.types'
import {
  COLUMNAS_DE_NOTIFICACION,
  type CursorDeNotificaciones,
  type PaginaDeNotificaciones,
  type PedidoDePagina,
  TAMANO_DE_LA_CAMPANA,
  TOPE_DEL_CONTADOR,
  notificacionesDesde,
} from '../entities/notificacion'

export type Cliente = SupabaseClient<Database>

// Lo que viene después del cursor, de más nuevo a más viejo: `(creado_en, id)` descendente. El valor va entre
// comillas: una fecha lleva `:` y `+`.
function despuesDe(cursor: CursorDeNotificaciones): string {
  const en = `"${cursor.creadoEn}"`
  return `creado_en.lt.${en},and(creado_en.eq.${en},id.lt.${cursor.id})`
}

// Una página por cursor, con una fila de más para saber si hay otra. Sin `desde` y por `todas`:
// `notificaciones_usuario_fecha_idx`; por `por-accionar`: el parcial `notificaciones_por_accionar_idx`.
export async function leerPagina(
  cliente: Cliente,
  { ver, desde, tamano }: PedidoDePagina,
): Promise<Resultado<PaginaDeNotificaciones>> {
  let consulta = cliente.from('notificaciones').select(COLUMNAS_DE_NOTIFICACION)
  if (ver === 'por-accionar') {
    consulta = consulta.eq('requiere_accion', true).is('accionada_en', null)
  }
  if (desde) {
    consulta = consulta.or(despuesDe(desde))
  }
  const { data, error } = await consulta
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(tamano + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const { filas, hayMas } = cortarAlTope(data, tamano)
  return ok({ filas: notificacionesDesde(filas), hayMas })
}

// El contador de la campana: las no leídas hasta `TOPE_DEL_CONTADOR` y de ahí «9+». Se lee una de más, nunca un
// `count`: `notificaciones_usuario_abiertas_idx` (usuario, creado_en desc donde no leída).
export async function contarNoLeidas(cliente: Cliente): Promise<Resultado<ConteoAcotado>> {
  const { data, error } = await cliente
    .from('notificaciones')
    .select('id')
    .is('leida_en', null)
    .order('creado_en', { ascending: false })
    .limit(TOPE_DEL_CONTADOR + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(conteoAcotado(data.length, TOPE_DEL_CONTADOR))
}

// Lo de la campana: primero las que piden acción y siguen abiertas y, si faltan, las más recientes de las demás
// hasta `TAMANO_DE_LA_CAMPANA`. Dos consultas con tope; la segunda sólo si la primera no llenó la campana.
export async function leerParaLaCampana(
  cliente: Cliente,
): Promise<Resultado<PaginaDeNotificaciones>> {
  const abiertas = await leerPagina(cliente, { ver: 'por-accionar', tamano: TAMANO_DE_LA_CAMPANA })
  if (!abiertas.ok) {
    return abiertas
  }
  const faltan = TAMANO_DE_LA_CAMPANA - abiertas.data.filas.length
  if (abiertas.data.hayMas || faltan <= 0) {
    return abiertas
  }
  // Las demás: `notificaciones_usuario_fecha_idx`, con el filtro de lo que no está pendiente de acción.
  const { data, error } = await cliente
    .from('notificaciones')
    .select(COLUMNAS_DE_NOTIFICACION)
    .or('requiere_accion.eq.false,accionada_en.not.is.null')
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(faltan + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const { filas, hayMas } = cortarAlTope(data, faltan)
  return ok({ filas: [...abiertas.data.filas, ...notificacionesDesde(filas)], hayMas })
}
