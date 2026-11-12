import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeNavieras } from '../../entities/cadena/repositorios'

// Las navieras activas, para el filtro «Naviera». Un catálogo de decenas de filas (`navieras_pkey`; policy `leer using (true)`), con tope de 200: no es una tabla que crece.
const TOPE_DE_NAVIERAS = 200

const esquemaDeNavieras = z.array(z.object({ id: z.guid(), nombre: z.string() }))

export const leerNavieras: LectorDeNavieras = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('navieras')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')
    .limit(TOPE_DE_NAVIERAS)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leidas = esquemaDeNavieras.safeParse(data)
  return leidas.success ? ok(leidas.data) : fallo('inesperado', MENSAJE_INESPERADO)
})
