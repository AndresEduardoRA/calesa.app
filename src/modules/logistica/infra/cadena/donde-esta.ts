import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { dondeEstaDesde } from '../../entities/cadena/leer'
import type { LectorDeDondeEsta } from '../../entities/cadena/repositorios'

// «Dónde está» (6.02-3): `logistica_donde_esta()` busca hasta 10 por título, VIN o lote (trigramas) sólo en los orígenes con la regla `logistica` activa y que la persona ve. Texto corto
// o sin orígenes: vacío, sin error. Más de 100 caracteres: 22023 (el que llama ya lo recorta).
export const TOPE_DE_DONDE_ESTA = 10

export const leerDondeEstaDeLaBase: LectorDeDondeEsta = async (buscar) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logistica_donde_esta', {
    p_buscar: buscar,
    p_tope: TOPE_DE_DONDE_ESTA,
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return dondeEstaDesde(data)
}
