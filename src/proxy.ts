import { NextResponse, type NextRequest } from 'next/server'
import { decidirAcceso } from '@/shared/lib/rutas'
import { actualizarSesion } from '@/shared/lib/supabase/proxy'

// Next 16: `proxy.ts` (antes `middleware.ts`) va al nivel de `app/`, no adentro.
// En cada request: refresca la sesión y decide si la persona pasa (`decidirAcceso`): sin sesión,
// lo protegido va a /ingreso con `returnTo`; con sesión, /ingreso y /registro van al inicio.
// Es la primera barrera; las pantallas vuelven a pedir la sesión (`requerirSesion`) y la base
// decide con RLS.
export async function proxy(request: NextRequest) {
  const { respuesta, usuarioId } = await actualizarSesion(request)

  // `_rsc` lo agrega el router de Next a sus pedidos internos: no es parte de a dónde iba.
  const busqueda = new URLSearchParams(request.nextUrl.search)
  busqueda.delete('_rsc')
  const query = busqueda.toString()

  const decision = decidirAcceso({
    ruta: request.nextUrl.pathname,
    busqueda: query ? `?${query}` : '',
    haySesion: usuarioId !== null,
    esAccion: request.headers.has('next-action'),
  })
  if (decision.tipo === 'seguir') {
    return respuesta
  }

  const redireccion = NextResponse.redirect(new URL(decision.destino, request.nextUrl.origin))
  // Si la sesión se refrescó en este request, las cookies nuevas viajan con la redirección.
  for (const cookie of respuesta.cookies.getAll()) {
    redireccion.cookies.set(cookie)
  }
  return redireccion
}

export const config = {
  // Todo menos lo que siempre es público: los estáticos de Next, el service worker, el manifest
  // y los íconos. Las pantallas de acceso y `/auth/*` pasan por acá y las deja seguir la regla.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|sw.js|manifest.webmanifest|iconos/).*)',
  ],
}
