import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import { dominadasDesde } from '../../entities/dominancia'
import { personasSinRolDesde } from '../../entities/sin-rol'
import { idsDelEquipoDesde, listaDelEquipoDesde } from '../../entities/lista-equipo'
import { personasDesde, vistaPreviaDesde, type FiltroDeEstado } from '../../entities/persona'
import type { LectorDePersonasSinRol } from '../../entities/sin-rol'
import type {
  LectorDeEquipo,
  LectorDePersona,
  LectorDeSoloYo,
  LectorDeVistaPreviaDeBaja,
} from '../../entities/repositorios-equipo'

// Las columnas de una persona con sus roles. `usuarios_roles` apunta dos veces a `perfiles` (la persona y quien le asignó el rol).
const PERSONA_CON_ROLES =
  'id, nombre, email, avatar_ruta, avatar_miniatura_ruta, activo, bloqueado, bloqueo_motivo, invitado_en, invitacion_aceptada_en, equipo_bajas!equipo_bajas_usuario_id_fkey(terminada_en), usuarios_roles!usuarios_roles_usuario_id_fkey(es_principal, roles(id, clave, nombre, color, orden))'

// Las primeras personas por nombre que cumplen el filtro (5a-21). Dos etapas: `equipo_lista()` dice cuáles son (a lo sumo `TOPE_DEL_EQUIPO + 1` ids, ordenados;
// comprueba `equipo.usuarios.ver`; se apoya en `perfiles_vigentes_orden_idx`, `perfiles_estado_orden_idx` y `perfiles_busqueda_idx`) y después, a la vez, se leen
// esas filas con sus roles por `id` (con la RLS de siempre) y a cuáles domina quien mira (`personas_dominadas()`, un pedido para toda la página, 9-1). Si esa
// lectura falla, la lista se dibuja igual con `dominada: null`. Los argumentos son primitivos para que `cache` repita la lectura de un mismo render.
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
  const [{ data, error }, dominadas] = await Promise.all([
    supabase
      .from('perfiles')
      .select(PERSONA_CON_ROLES)
      .in('id', idsDeLaLista)
      .order('nombre')
      .order('email')
      .order('id'),
    supabase.rpc('personas_dominadas', { p_ids: idsDeLaLista }),
  ])
  if (error) {
    return { ok: false, error: errorDePostgrest(error) } as const
  }
  return ok(listaDelEquipoDesde(data, dominadasDesde(dominadas)))
})

export const getEquipo: LectorDeEquipo = ({ texto, estado }) => leerLista(texto, estado)

// Una persona por su id, esté o no en la página que se dibuja (`?persona=` y `?baja=` traen un id de la URL).
export const getPersona: LectorDePersona = cache(async (personaId) => {
  const supabase = await createClient()
  const [{ data, error }, dominadas] = await Promise.all([
    supabase.from('perfiles').select(PERSONA_CON_ROLES).eq('id', personaId).maybeSingle(),
    supabase.rpc('personas_dominadas', { p_ids: [personaId] }),
  ])
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data ? (personasDesde([data], dominadasDesde(dominadas))[0] ?? null) : null)
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

// Las primeras personas activas, no bloqueadas y sin ningún rol (Inicio, 9.02): `perfiles` con una anti-unión sobre `usuarios_roles`
// (la fila falta). Sigue `perfiles_vigentes_orden_idx` (nombre, correo, id) y corta en `tope + 1`; el equipo es una tabla de decenas o cientos de filas.
// `perfiles: leer` deja ver nombre y correo a toda persona activa: el permiso lo comprueba quien monta el bloque.
export const getPersonasSinRol: LectorDePersonasSinRol = async ({ tope }) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, email, usuarios_roles!usuarios_roles_usuario_id_fkey(usuario_id)')
    .eq('activo', true)
    .eq('bloqueado', false)
    .is('usuarios_roles', null)
    .order('nombre')
    .order('email')
    .order('id')
    .limit(tope + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const personas = personasSinRolDesde(data)
  return ok({ personas: personas.slice(0, tope), hayMas: personas.length > tope })
}
