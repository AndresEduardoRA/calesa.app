import 'server-only'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { cache } from 'react'
import { createClient, type ClienteSupabase } from '@/shared/lib/supabase/server'
import { COOKIE_PERSPECTIVA, leerPerspectiva } from '../../entities/perspectiva'
import type { LectorDeSesion } from '../../entities/repositorios'
import { sesionDesde, sesionSinPerfil, type EstadoCuenta, type Sesion } from '../../entities/sesion'

// Con un cliente que ya tiene sesión: perfil, roles, permisos y preferencias en una sola ida.
// La perspectiva «ver como» viaja en una cookie con el id del rol; la base decide si esta persona
// puede usarla y devuelve los permisos efectivos (nunca más que los reales).
async function leerSesion(
  supabase: ClienteSupabase,
  usuarioId: string,
  email: string,
): Promise<Sesion> {
  const almacen = await cookies()
  const perspectiva = leerPerspectiva(almacen.get(COOKIE_PERSPECTIVA)?.value)
  const { data, error } = await supabase.rpc(
    'mi_sesion',
    perspectiva ? { p_perspectiva: perspectiva } : {},
  )
  if (error) {
    throw new Error(`mi_sesion() falló: ${error.message}`)
  }
  // Sesión de Auth sin perfil: la cuenta se eliminó con la sesión abierta.
  return sesionDesde(data) ?? sesionSinPerfil(usuarioId, email)
}

// La sesión de este request, o null si nadie ingresó. `cache()` la reparte entre el layout, la
// página y lo que la pida: una verificación del JWT y una RPC por request, no una por componente.
export const getSesion: LectorDeSesion = cache(async () => {
  // La sesión es de cada request. Sin esto, cuando Next prepara la cáscara de una ruta por
  // adelantado (prefetch parcial) intentaría leerla ahí, y verificar el JWT mira la hora.
  await connection()
  const supabase = await createClient()
  // getClaims() verifica la firma del JWT; getSession() confiaría en la cookie sin verificarla.
  const { data } = await supabase.auth.getClaims()
  const usuarioId = data?.claims.sub
  if (!usuarioId) {
    return null
  }
  return leerSesion(supabase, usuarioId, data.claims.email ?? '')
})

// Justo después de crear una sesión (ingresar, canjear un enlace), con el mismo cliente que la
// creó: todavía no hay un request nuevo del que `getSesion()` pueda leer la cookie.
export async function estadoDeLaCuenta(supabase: ClienteSupabase): Promise<EstadoCuenta> {
  const { data, error } = await supabase.rpc('mi_sesion')
  if (error) {
    throw new Error(`mi_sesion() falló: ${error.message}`)
  }
  return sesionDesde(data)?.estado ?? 'baja'
}
