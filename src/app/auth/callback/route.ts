import { NextResponse, type NextRequest } from 'next/server'
import { canjearAcceso } from '@/modules/equipo'

// Por acá vuelven Google (con `code`) y los enlaces de los correos de Auth (con `token_hash` y
// `type`: confirmar la cuenta, recuperar la contraseña, aceptar una invitación). Canjea lo que
// llegó por una sesión y redirige; un enlace vencido o una falla de Google también terminan en
// una pantalla con su explicación, nunca en un error crudo.
export async function GET(request: NextRequest) {
  const destino = await canjearAcceso(request.nextUrl.searchParams)
  return NextResponse.redirect(new URL(destino, request.nextUrl.origin))
}
