import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeAtributos } from '../../entities/cadena/repositorios'

// Los atributos de las tarjetas de una columna, para nombrarlas por el campo principal del origen (6.13). Por clave primaria (`vehiculos_pkey`), en tandas de `POR_TANDA` ids (la URL
// de PostgREST es corta) y bajo la RLS «vehiculos: leer»: un vehículo que quien mira no ve no vuelve, y su tarjeta queda con el título. Una tanda fallida es un error: quien llama decide.
export const POR_TANDA = 100

const esquemaDeFila = z.object({
  id: z.guid(),
  atributos: z.record(z.string(), z.unknown()).catch({}),
})

export const leerAtributosDeLaBase: LectorDeAtributos = async (ids) => {
  const supabase = await createClient()
  const porId = new Map<string, Record<string, unknown>>()
  for (let desde = 0; desde < ids.length; desde += POR_TANDA) {
    const tanda = ids.slice(desde, desde + POR_TANDA)
    const { data, error } = await supabase
      .from('vehiculos')
      .select('id, atributos')
      .in('id', tanda)
      .is('eliminado_en', null)
      .limit(POR_TANDA)
    if (error) return { ok: false, error: errorDePostgrest(error) }
    for (const fila of data) {
      const leida = esquemaDeFila.safeParse(fila)
      if (leida.success) porId.set(leida.data.id, leida.data.atributos)
    }
  }
  return ok(porId)
}
