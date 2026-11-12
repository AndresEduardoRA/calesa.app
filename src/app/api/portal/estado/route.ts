import type { NextRequest } from 'next/server'
import { leerEstadoDelPortal } from '@/modules/web'
import { comenzar, inesperado, json, sesionDelPedido, sinSesion } from '../_comun'

// El estado del cliente en el portal (8.07-3): `portal_snapshot` tal cual (vehículos con el VIN parcial, fases, documentos visibles).
//
//   GET   200 { … } | 401 (sin sesión, revocada o vuelta a otorgar: borra la cookie) | 500 | 503

export async function GET(peticion: NextRequest) {
  const cortar = await comenzar()
  if (cortar) return cortar
  const sesion = sesionDelPedido(peticion)
  if (!sesion) return sinSesion()
  const estado = await leerEstadoDelPortal(sesion)
  if (!estado.ok) return inesperado()
  return estado.data === null ? sinSesion() : json(estado.data, 200)
}
