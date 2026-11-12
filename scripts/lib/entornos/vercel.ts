// Los NOMBRES de las variables de un proyecto de Vercel, por destino. La API puede devolver el valor (`type: plain`): el esquema de abajo
// sólo conoce `key` y `target`, así que `value` se descarta al parsear y nunca viaja a un tipo que lo lleve.
import { z } from 'zod'

import { pedirJson, type Lectura, type Pedir } from './lectura'

const respuesta = z.object({
  envs: z.array(
    z.object({
      key: z.string(),
      target: z.union([z.array(z.string()), z.string()]).nullish(),
    }),
  ),
})

export type VariablesDeVercel = { production: string[]; preview: string[] }

export async function leerVariablesDeVercel(args: {
  pedir: Pedir
  token: string
  proyecto: string
  equipo?: string | undefined
}): Promise<Lectura<VariablesDeVercel>> {
  const consulta = args.equipo ? `?teamId=${encodeURIComponent(args.equipo)}` : ''
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(args.proyecto)}/env${consulta}`
  const leida = await pedirJson(args.pedir, url, args.token)
  if (!leida.ok) return leida
  const r = respuesta.safeParse(leida.datos)
  if (!r.success) return { ok: false, motivo: 'respuesta con otra forma' }
  const production = new Set<string>()
  const preview = new Set<string>()
  for (const { key, target } of r.data.envs) {
    // Sin destino cuenta en todos; un texto suelto es un destino.
    const destinos = target === undefined || target === null ? [] : [target].flat()
    const todos = destinos.length === 0
    if (todos || destinos.includes('production')) production.add(key)
    if (todos || destinos.includes('preview')) preview.add(key)
  }
  return {
    ok: true,
    datos: { production: [...production].sort(), preview: [...preview].sort() },
  }
}
