import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { cambiarClaveDelPortal } from '@/modules/web'
import {
  comenzar,
  inesperado,
  json,
  leerCuerpo,
  origenNoPermitido,
  sesionDelPedido,
  sinSesion,
} from '../_comun'

// El cambio de clave del cliente en el portal (8.07-3). La sesión sigue: `portal_cambiar_clave` no cambia `otorgado_en`.
//
//   POST { actual, nueva }
//   200 { ok: true } | 400 (cuerpo inválido o clave actual que no vale; la nueva que no cumple, con el mensaje de la base)
//   | 401 (borra la cookie) | 403 | 500 | 503
//
// Un `false` de la base puede ser también una sesión que ya no vale: responde el mismo 400 y el sitio lo ve en el siguiente `estado`
// (D14). Sin límite por IP: exige la cookie y la base bloquea a los 5 fallos de la clave actual (D12).

const pedido = z.strictObject({
  actual: z.string().min(1).max(72),
  nueva: z.string().min(1).max(72),
})

const noSePudo = () => json({ error: 'No pudimos cambiar la clave.' }, 400)

export async function POST(peticion: NextRequest) {
  const cortar = (await comenzar()) ?? (await origenNoPermitido(peticion))
  if (cortar) return cortar
  const sesion = sesionDelPedido(peticion)
  if (!sesion) return sinSesion()
  const cuerpo = await leerCuerpo(peticion, pedido)
  if (!cuerpo) return noSePudo()
  const cambio = await cambiarClaveDelPortal(sesion, cuerpo.actual, cuerpo.nueva)
  if (cambio.ok) return cambio.data ? json({ ok: true }, 200) : noSePudo()
  return cambio.error.codigo === 'regla' ? json({ error: cambio.error.mensaje }, 400) : inesperado()
}
