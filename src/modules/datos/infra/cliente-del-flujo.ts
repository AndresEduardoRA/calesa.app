import 'server-only'
import { createClient as crearClienteConToken, type SupabaseClient } from '@supabase/supabase-js'
import { entornoPublico } from '@/shared/config/entorno'
import { fallo, ok, MENSAJE_SESION_VENCIDA, type Resultado } from '@/shared/lib/errores'
import { createClient, type ClienteSupabase } from '@/shared/lib/supabase/server'
import type { Database } from '@/shared/types/database.types'
import { necesitaRenovar } from '../entities/exportacion'

// El cliente con el que lee el flujo de «exportar todo» (9.05-2): la sesión de quien exporta, con su token **fijo**. Un flujo sigue leyendo
// después de responder, cuando la cookie ya no se puede escribir: si el cliente refrescara a mitad de camino rotaría el refresh token sin poder
// guardarlo, y el navegador quedaría con uno usado (la detección de reuso cierra la sesión). Con `accessToken`, supabase-js no tiene `auth`
// (cualquier acceso lanza) y nunca refresca: el token es el que se verificó acá, dentro del pedido.
export type ClienteDelFlujo = SupabaseClient<Database>

export type SesionDelFlujo = {
  cliente: ClienteDelFlujo
  // Cuándo vence el token (segundos desde 1970), de los claims verificados: el flujo deja de pedir páginas antes.
  venceEn: number
}

export function clienteDelFlujo(token: string): ClienteDelFlujo {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = entornoPublico()
  return crearClienteConToken<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      accessToken: () => Promise.resolve(token),
    },
  )
}

type Verificado = { token: string; venceEn: number }

// La excepción a «nunca getSession()»: `getClaims()` no devuelve el token crudo, así que se toma de la sesión y se verifica **ese mismo** con
// `getClaims(token)` (firma y vencimiento). La identidad y el vencimiento salen sólo de los claims verificados; de la sesión, nada más que el token.
async function verificar(supabase: ClienteSupabase, token: string): Promise<Verificado | null> {
  const { data, error } = await supabase.auth.getClaims(token)
  if (error || !data) {
    return null
  }
  const { sub, exp } = data.claims
  return typeof sub === 'string' && sub !== '' && typeof exp === 'number'
    ? { token, venceEn: exp }
    : null
}

const sinSesion = fallo('no_autenticado', MENSAJE_SESION_VENCIDA)

// Dentro del pedido, antes de crear la respuesta: si al token le queda poco, se renueva acá (la cookie nueva viaja con la respuesta, porque Next
// le agrega las cookies cambiadas). Renovar después de crear la respuesta cerraría la sesión por reuso del refresh token.
export async function prepararSesion(
  ahoraMs: number = Date.now(),
): Promise<Resultado<SesionDelFlujo>> {
  const supabase = await createClient()
  const { data: guardada } = await supabase.auth.getSession()
  if (!guardada.session) {
    return sinSesion
  }
  let verificado = await verificar(supabase, guardada.session.access_token)
  if (verificado === null) {
    return sinSesion
  }
  if (necesitaRenovar(verificado.venceEn, ahoraMs)) {
    const { data: renovada, error } = await supabase.auth.refreshSession()
    if (error || !renovada.session) {
      return sinSesion
    }
    verificado = await verificar(supabase, renovada.session.access_token)
    if (verificado === null) {
      return sinSesion
    }
  }
  return ok({ cliente: clienteDelFlujo(verificado.token), venceEn: verificado.venceEn })
}
