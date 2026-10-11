import { NextResponse, type NextRequest } from 'next/server'
import { cerrarSiInactiva } from '@/modules/equipo'

// A dónde manda `requerirSesion()` a una cuenta bloqueada o dada de baja: un Server Component no
// puede borrar cookies, un route handler sí. Con una cuenta activa no hace nada (devuelve al
// inicio): un enlace a esta ruta no sirve para cerrarle la sesión a nadie. Cerrar la sesión
// propia es la action `cerrarSesion`.
export async function GET(request: NextRequest) {
  const destino = await cerrarSiInactiva()
  return NextResponse.redirect(new URL(destino, request.nextUrl.origin))
}
