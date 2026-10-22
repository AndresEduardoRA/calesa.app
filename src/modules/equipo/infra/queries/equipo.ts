import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import { idsDelEquipoDesde, listaDelEquipoDesde } from '../../entities/lista-equipo'
import { personasDesde, vistaPreviaDesde, type FiltroDeEstado } from '../../entities/persona'
import type {
  LectorDeEquipo,
  LectorDePersona,
  LectorDeSoloYo,
  LectorDeVistaPreviaDeBaja,
} from '../../entities/repositorios-equipo'

// Las columnas de una persona con sus roles. `usuarios_roles` apunta dos veces a `perfiles` (la persona y quien le asignó el rol).
const PERSONA_CON_ROLES =
  'id, nombre, email, avatar_ruta, avatar_miniatura_ruta, activo, bloqueado, bloqueo_motivo, invitado_en, invitacion_aceptada_en, equipo_bajas!equipo_bajas_usuario_id_fkey(terminada_en), usuarios_roles!usuarios_roles_usuario_id_fkey(es_principal, roles(id, clave, nombre, color, orden))'

// Las primeras personas por nombre que cumplen el filtro (5a-21). Dos pasos: `equipo_lista()` dice cuáles son (a lo sumo `TOPE_DEL_EQUIPO + 1` ids, ordenados;
// comprueba `equipo.usuarios.ver`; se apoya en `perfiles_vigentes_orden_idx`, `perfiles_estado_orden_idx` y `perfiles_busqueda_idx`) y después se leen esas filas
// con sus roles por `id`, con la RLS de siempre. Los argumentos son primitivos para que `cache` repita la lectura de un mismo render.
const leerLista = cache(async (texto: string, estado: FiltroDeEstado) => {
  const supabase = await createClient()
  const ids = await supabase.rpc('equipo_lista', {
    p_texto: texto,
    p_estado: estado,
    p_limite: TOPE_DEL_EQUIPO + 1,
  })
  if (ids.error) {
    return { ok: false, error: errorDePostgrest(ids.error) } as const
  }
  const idsDeLaLista = idsDelEquipoDesde(ids.data)
  if (idsDeLaLista.length === 0) {
    return ok({ personas: [], hayMas: false })
  }
  const { data, error } = await supabase
    .from('perfiles')
    .select(PERSONA_CON_ROLES)
    .in('id', idsDeLaLista)
    .order('nombre')
    .order('email')
    .order('id')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) } as const
  }
  return ok(listaDelEquipoDesde(data))
})

export const getEquipo: LectorDeEquipo = ({ texto, estado }) => leerLista(texto, estado)

// Una persona por su id, esté o no en la página que se dibuja (`?persona=` y `?baja=` traen un id de la URL).
export const getPersona: LectorDePersona = cache(async (personaId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select(PERSONA_CON_ROLES)
    .eq('id', personaId)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data ? (personasDesde([data])[0] ?? null) : null)
})

// ¿Hay alguien más que quien mira? Dos personas vigentes alcanzan para saber que no.
export const getSoloYo: LectorDeSoloYo = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('perfiles').select('id').eq('activo', true).limit(2)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data.length < 2)
})

// Cuántos leads irían al limbo si esa persona saliera ahora. Sólo conteos: la RPC comprueba
// `equipo.usuarios.gestionar` y no devuelve ningún lead.
export const getVistaPreviaDeBaja: LectorDeVistaPreviaDeBaja = async (personaId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('equipo_vista_previa_baja', { p_usuario: personaId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vistaPreviaDesde(data))
}
