import 'server-only'
import { z } from 'zod'
import { entornoPublico } from '@/shared/config/entorno'
import { ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { errorDeAuth } from '../entities/errores-acceso'
import type { ServicioAcceso } from '../entities/repositorios'
import { estadoDeLaCuenta } from './queries/sesion'

// Supabase Auth detrás de la interfaz que usan los casos de uso. Cada función crea su cliente
// (uno por request, nunca global) y devuelve valores: los errores de Auth salen ya traducidos.

const ingresar: ServicioAcceso['ingresar'] = async ({ email, contrasena }) => {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena })
  if (error) {
    return { ok: false, error: errorDeAuth(error) }
  }
  return ok({ estado: await estadoDeLaCuenta(supabase) })
}

const registrar: ServicioAcceso['registrar'] = async ({ nombre, email, contrasena }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: contrasena,
    // El trigger `auth_crear_perfil()` lee `nombre` de acá para el perfil.
    options: { data: { nombre } },
  })
  if (error) {
    return { ok: false, error: errorDeAuth(error) }
  }
  return ok({ sesionIniciada: data.session !== null })
}

const pedirRecuperacion: ServicioAcceso['pedirRecuperacion'] = async (email) => {
  const supabase = await createClient()
  // Sin `redirectTo`: la plantilla del correo arma el enlace con la URL del sitio y `token_hash`.
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) {
    return { ok: false, error: errorDeAuth(error) }
  }
  return ok(null)
}

const fijarContrasena: ServicioAcceso['fijarContrasena'] = async (contrasena) => {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: contrasena })
  if (error) {
    return { ok: false, error: errorDeAuth(error) }
  }
  return ok(null)
}

const urlDeGoogle: ServicioAcceso['urlDeGoogle'] = async (volverA) => {
  const supabase = await createClient()
  // En el servidor no hay navegador que redirigir: devuelve la URL y deja el verificador PKCE en
  // una cookie, que es lo que después permite canjear el código.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: volverA, skipBrowserRedirect: true },
  })
  if (error) {
    return { ok: false, error: errorDeAuth(error) }
  }
  return ok({ url: data.url })
}

const canjear: ServicioAcceso['canjear'] = async (pedido) => {
  const supabase = await createClient()
  const { error } =
    pedido.tipo === 'codigo'
      ? await supabase.auth.exchangeCodeForSession(pedido.codigo)
      : await supabase.auth.verifyOtp({ token_hash: pedido.tokenHash, type: pedido.tipoEnlace })
  if (error) {
    return { ok: false, error: errorDeAuth(error) }
  }
  return ok({ estado: await estadoDeLaCuenta(supabase) })
}

const cerrarSesion: ServicioAcceso['cerrarSesion'] = async () => {
  const supabase = await createClient()
  // `local`: sólo este navegador. Si Auth ya no conoce la sesión, las cookies se limpian igual.
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) {
    console.error('No se pudo cerrar la sesión en Auth', error)
  }
}

const esquemaAjustesDeAuth = z.object({ external: z.record(z.string(), z.boolean()) })

// Auth publica qué proveedores tiene encendidos. Con Google apagado, mandar a la persona a
// `/authorize` le mostraría un JSON de error: se pregunta antes y el botón no se dibuja.
const googleHabilitado: ServicioAcceso['googleHabilitado'] = async () => {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = entornoPublico()
  try {
    const respuesta = await fetch(`${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(3000),
    })
    const ajustes = esquemaAjustesDeAuth.parse(await respuesta.json())
    return ajustes.external['google'] === true
  } catch (error) {
    // Si Auth no responde, ingresar con contraseña tampoco va a andar: no se suma un botón roto.
    console.error('No se pudo consultar los proveedores de Auth', error)
    return false
  }
}

export const accesoSupabase: ServicioAcceso = {
  ingresar,
  registrar,
  pedirRecuperacion,
  fijarContrasena,
  urlDeGoogle,
  canjear,
  cerrarSesion,
  googleHabilitado,
}
