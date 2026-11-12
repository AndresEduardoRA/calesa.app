// Lo que Supabase (API de gestión) tiene en un proyecto: los NOMBRES de los secretos de las funciones y, de la configuración de Auth,
// sólo si cada ajuste «está» (`presente`) o no es el esperado (`distinto`). Los valores (y el hash de un secreto) se descartan aquí
// mismo: la respuesta completa no sale de estas funciones.
import { z } from 'zod'

import { esquemaDeAuth, VIDA_DE_LA_INVITACION } from '../../../src/shared/config/esquemas'

import { pedirJson, type Lectura, type Pedir } from './lectura'

const secretos = z.array(z.object({ name: z.string() }))
const AJUSTES_DE_AUTH = Object.keys(esquemaDeAuth.shape)

export type AuthLeido = Record<string, 'presente' | 'distinto'>

const base = (ref: string) => `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}`

export async function leerSecretosDeLasFunciones(args: {
  pedir: Pedir
  token: string
  ref: string
}): Promise<Lectura<string[]>> {
  const leida = await pedirJson(args.pedir, `${base(args.ref)}/secrets`, args.token)
  if (!leida.ok) return leida
  const r = secretos.safeParse(leida.datos)
  if (!r.success) return { ok: false, motivo: 'respuesta con otra forma' }
  return { ok: true, datos: [...new Set(r.data.map((s) => s.name))].sort() }
}

export async function leerAuth(args: {
  pedir: Pedir
  token: string
  ref: string
}): Promise<Lectura<AuthLeido>> {
  const leida = await pedirJson(args.pedir, `${base(args.ref)}/config/auth`, args.token)
  if (!leida.ok) return leida
  const r = z.record(z.string(), z.unknown()).safeParse(leida.datos)
  if (!r.success) return { ok: false, motivo: 'respuesta con otra forma' }
  const datos: AuthLeido = {}
  for (const ajuste of AJUSTES_DE_AUTH) {
    const valor = r.data[ajuste]
    if (ajuste === 'mailer_otp_exp') {
      if (valor === undefined || valor === null || valor === '') continue
      datos[ajuste] = Number(valor) === VIDA_DE_LA_INVITACION ? 'presente' : 'distinto'
    } else if (typeof valor === 'string' && valor.trim() !== '') {
      datos[ajuste] = 'presente'
    }
  }
  return { ok: true, datos }
}
