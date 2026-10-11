import type { NextRequest } from 'next/server'
import { actualizarSesion } from '@/shared/lib/supabase/proxy'

// Next 16: `proxy.ts` (antes `middleware.ts`) va al nivel de `app/`, no adentro.
// Por ahora sólo mantiene viva la sesión. La redirección al ingreso llega con esa pantalla.
export async function proxy(request: NextRequest) {
  const { respuesta } = await actualizarSesion(request)
  return respuesta
}

export const config = {
  // Todo menos los estáticos de Next, el service worker, el manifest y los íconos.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|sw.js|manifest.webmanifest|iconos/).*)',
  ],
}
