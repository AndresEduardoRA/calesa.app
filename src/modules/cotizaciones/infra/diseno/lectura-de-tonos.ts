// El catálogo de tonos para editarlo (4.22-4) sobre el cliente que recibe, sin `server-only` para que una prueba la corra; `lectura.ts` la envuelve con la sesión.
// `tonos` la lee todo `authenticated` (policy `tonos: leer`) y la base no deja pasar de `_tonos_tope()` = 24: es una tabla de configuración con tope duro.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import { esquemaDeLaFilaDeTonos, tonoDesdeLaFila } from '../../entities/diseno/respuesta-de-tonos'
import { TOPE_DE_TONOS, type ListaDeTonos } from '../../entities/diseno/tonos'

// Los tonos por nombre, `limit` del tope de la base: sin índice que valga la pena en decenas de filas.
export async function leerTonosSobre(
  cliente: SupabaseClient<Database>,
): Promise<Resultado<ListaDeTonos>> {
  const { data, error } = await cliente
    .from('tonos')
    .select(
      'id, clave, nombre, actualizado_en, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta',
    )
    .order('nombre')
    .limit(TOPE_DE_TONOS)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leidos = z.array(esquemaDeLaFilaDeTonos).safeParse(data)
  if (!leidos.success) return fallo('inesperado', 'No pudimos leer los tonos.')
  return ok({ tope: TOPE_DE_TONOS, tonos: leidos.data.map(tonoDesdeLaFila) })
}
