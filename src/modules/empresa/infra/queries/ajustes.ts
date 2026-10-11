import 'server-only'
import { connection } from 'next/server'
import { cache } from 'react'
import { createClient } from '@/shared/lib/supabase/server'
import { AJUSTES_POR_DEFECTO, ajustesDesde, type Ajustes } from '../../entities/ajustes'

// Una lectura por request, la pida quien la pida (layout, página, action). Funciona con y sin
// sesión: `web.ajustes_acceso()` es lo único de la empresa que `anon` puede leer.
export const getAjustes = cache(async (): Promise<Ajustes> => {
  // Se lee en cada request (el registro puede abrirse o cerrarse en cualquier momento): nunca
  // mientras Next prepara una ruta por adelantado, donde la consulta quedaría cortada.
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase.schema('web').rpc('ajustes_acceso').maybeSingle()
  const ajustes = error ? null : ajustesDesde(data)
  if (!ajustes) {
    // La pantalla se dibuja igual, con la identidad neutra y el registro cerrado.
    console.error('ajustes_acceso() no devolvió los ajustes de la empresa', error ?? data)
    return AJUSTES_POR_DEFECTO
  }
  return ajustes
})
