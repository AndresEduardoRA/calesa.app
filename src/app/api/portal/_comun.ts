import { connection, type NextRequest, NextResponse } from 'next/server'
import type { z } from 'zod'
import {
  COOKIE_DEL_PORTAL,
  DURACION_DE_LA_SESION_S,
  direccionDelSitioParaElPortal,
  leerSesionDelPortal,
  mismoOrigenDelPortal,
  opcionesDeLaCookieDelPortal,
  portalDisponible,
  type SesionDelPortal,
} from '@/modules/web'
import { MENSAJE_INESPERADO } from '@/shared/lib/errores'

// Lo común de los route handlers del portal del cliente (8.07-3). El portal no tiene sesión de Supabase: la puerta es la cookie
// firmada `portal` (`Path=/api/portal`) y, en la base, `_portal_vigente`. Lo importan sólo los handlers de esta carpeta. El contrato
// con el sitio, que reescribe `/api/portal/*` hacia aquí, está en la ficha de `web` y en `docs/DECISIONES.md`.

const SIN_GUARDAR = { 'Cache-Control': 'no-store' }
const TOPE_DEL_CUERPO = 2048

export function json(cuerpo: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(cuerpo, { status, headers: { ...SIN_GUARDAR, ...extra } })
}

export function vacia(status: number, extra: Record<string, string> = {}) {
  return new NextResponse(null, { status, headers: { ...SIN_GUARDAR, ...extra } })
}

export function inesperado() {
  return json({ error: MENSAJE_INESPERADO }, 500)
}

// La primera línea de cada handler. `connection()` lo vuelve dinámico: con `cacheComponents`, un GET que sale sin leer el pedido se
// prerenderiza en el build, y el build del CI corre sin el secreto (el 503 quedaría guardado). Sin secreto, 503 antes de leer nada.
export async function comenzar(): Promise<NextResponse | null> {
  await connection()
  return portalDisponible() ? null : json({ error: 'El portal no está disponible.' }, 503)
}

// Todo POST exige un `Origin`: el del CRM mismo o el de la dirección pública del sitio (Configuración › Sitio web). La dirección se lee
// sólo si no es el propio; un error al leerla no deja pasar.
export async function origenNoPermitido(peticion: NextRequest): Promise<NextResponse | null> {
  const origen = peticion.headers.get('origin')
  if (mismoOrigenDelPortal(origen, peticion.url)) return null
  if (origen) {
    const direccion = await direccionDelSitioParaElPortal()
    if (direccion.ok && mismoOrigenDelPortal(origen, direccion.data)) return null
  }
  return json({ error: 'Origen no permitido.' }, 403)
}

export function sesionDelPedido(peticion: NextRequest): SesionDelPortal | null {
  return leerSesionDelPortal(peticion.cookies.get(COOKIE_DEL_PORTAL)?.value, new Date())
}

export function ponerCookie(respuesta: NextResponse, valor: string): NextResponse {
  respuesta.cookies.set(
    COOKIE_DEL_PORTAL,
    valor,
    opcionesDeLaCookieDelPortal(DURACION_DE_LA_SESION_S),
  )
  return respuesta
}

export function borrarCookie(respuesta: NextResponse): NextResponse {
  respuesta.cookies.set(COOKIE_DEL_PORTAL, '', opcionesDeLaCookieDelPortal(0))
  return respuesta
}

// Una cookie que falta, no vale, venció o quedó revocada: 401 y se borra. El sitio sólo sabe «volver a ingresar».
export function sinSesion(): NextResponse {
  return borrarCookie(json({ error: 'Tu sesión terminó. Vuelve a ingresar.' }, 401))
}

// El cuerpo JSON validado, o nulo si es grande, no es JSON o no pasa el esquema.
export async function leerCuerpo<T>(
  peticion: NextRequest,
  esquema: z.ZodType<T>,
): Promise<T | null> {
  if (Number(peticion.headers.get('content-length') ?? 0) > TOPE_DEL_CUERPO) return null
  const texto = await peticion.text()
  if (texto.length > TOPE_DEL_CUERPO) return null
  let dato: unknown
  try {
    dato = JSON.parse(texto)
  } catch {
    return null
  }
  const r = esquema.safeParse(dato)
  return r.success ? r.data : null
}
