import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { urlDeDocumentoDelPortal } from '@/modules/web'
import { comenzar, inesperado, json, sesionDelPedido, sinSesion, vacia } from '../../_comun'

// Un documento del cliente en el portal (8.07-3): 302 a una URL firmada de 60 s del bucket `documentos`. La ruta de storage no sale
// en el cuerpo ni en un error; sí viaja dentro de la URL firmada, como la arma Supabase.
//
//   GET   302 Location | 401 (borra la cookie) | 404 (id inválido o ajeno, el mismo) | 500 | 503
//
// La cookie se mira antes que el id: sin sesión no se sondea qué ids existen (D11).

const noDisponible = () => json({ error: 'Ese documento no está disponible.' }, 404)

export async function GET(
  peticion: NextRequest,
  { params }: RouteContext<'/api/portal/documentos/[id]'>,
) {
  const cortar = await comenzar()
  if (cortar) return cortar
  const sesion = sesionDelPedido(peticion)
  if (!sesion) return sinSesion()
  const { id } = await params
  if (!z.guid().safeParse(id).success) return noDisponible()
  const url = await urlDeDocumentoDelPortal(sesion, id)
  if (!url.ok) return inesperado()
  if (url.data === null) return noDisponible()
  return vacia(302, { Location: url.data, 'Referrer-Policy': 'no-referrer' })
}
