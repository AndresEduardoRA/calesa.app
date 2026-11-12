import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  contarIntentoDelPortal,
  firmarSesionDelPortal,
  ingresarAlPortal,
  ipDelPedido,
} from '@/modules/web'
import { comenzar, json, leerCuerpo, origenNoPermitido, ponerCookie } from '../_comun'

// El ingreso al portal del cliente (8.07-3).
//
//   POST { codigo, clave }
//   200 { nombre, debe_cambiar_clave } + cookie `portal` | 401 (todo fallo, el mismo cuerpo) | 403 | 429 + Retry-After | 503
//
// Primero el límite por IP (10 por 15 min), después el cuerpo y el login. Todo fallo, también un error de la base o un cuerpo
// inválido, da el mismo 401: no se sabe si el código existe ni por qué no entró (D4).

const pedido = z.strictObject({
  codigo: z.string().trim().min(1).max(40),
  clave: z.string().min(1).max(72),
})

const VENTANA_S = '900'

const noCoinciden = () => json({ error: 'El código o la clave no coinciden.' }, 401)

export async function POST(peticion: NextRequest) {
  const cortar = (await comenzar()) ?? (await origenNoPermitido(peticion))
  if (cortar) return cortar
  const puede = await contarIntentoDelPortal(ipDelPedido(peticion.headers))
  if (!puede.ok) return noCoinciden()
  if (!puede.data) {
    return json({ error: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.' }, 429, {
      'Retry-After': VENTANA_S,
    })
  }
  const cuerpo = await leerCuerpo(peticion, pedido)
  if (!cuerpo) return noCoinciden()
  const ingreso = await ingresarAlPortal(cuerpo.codigo, cuerpo.clave)
  if (!ingreso.ok || !ingreso.data) return noCoinciden()
  const { sesion, nombre, debe_cambiar_clave } = ingreso.data
  return ponerCookie(
    json({ nombre, debe_cambiar_clave }, 200),
    firmarSesionDelPortal(sesion, new Date()),
  )
}
