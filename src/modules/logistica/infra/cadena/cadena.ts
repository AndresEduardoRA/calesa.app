import 'server-only'
import { errorDePostgrest, fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TAMANO_DE_COLUMNA } from '@/shared/lib/paginacion'
import { cadenaDesde, paginaDeLaColumnaDesde } from '../../entities/cadena/leer'
import type { LectorDeLaCadena, LectorDeLaColumna } from '../../entities/cadena/repositorios'

// La cadena se lee con `logistica_cadena()` y «Ver más» con `logistica_cadena_columna()` (6.02-2), con la sesión de quien mira: la base decide el acceso (`logistica.ver` y `vehiculos.ver`
// del origen; sin él, 42501) y cada columna se resuelve por `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id)`. La respuesta es `Json`: la entidad la valida.

const NO_SE_PUDO_CARGAR_MAS = 'No se pudo cargar más. Intenta de nuevo.'

// `p_fase` no admite nulo en los tipos generados; la base sí («Sin fase»).
const faseParaLaBase = (faseId: string | null): string => faseId as string

export const leerCadenaDeLaBase: LectorDeLaCadena = async (origenId, filtros) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logistica_cadena', {
    p_origen: origenId,
    p_tope: TAMANO_DE_COLUMNA,
    p_filtros: { ...filtros },
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return cadenaDesde(data)
}

export const leerColumnaDeLaBase: LectorDeLaColumna = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logistica_cadena_columna', {
    p_origen: pedido.origenId,
    p_fase: faseParaLaBase(pedido.faseId),
    ...(pedido.cursor?.desde ? { p_desde: pedido.cursor.desde } : {}),
    ...(pedido.cursor ? { p_id: pedido.cursor.id } : {}),
    p_tope: TAMANO_DE_COLUMNA,
    p_filtros: { ...pedido.filtros },
  })
  if (error) {
    // Un cursor inválido o una fase ajena no son algo que la persona pueda corregir: se dice que no cargó.
    return error.code === '22023'
      ? (fallo('regla', NO_SE_PUDO_CARGAR_MAS) as Resultado<never>)
      : { ok: false, error: errorDePostgrest(error) }
  }
  return paginaDeLaColumnaDesde(data)
}
