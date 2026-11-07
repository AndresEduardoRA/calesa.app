// El valor por defecto de unas constantes (el ⚙ de una celda de la hoja, 4.20-3a), sobre el cliente que recibe: el del navegador, con la sesión de quien abre el ⚙. La
// policy `formulas: leer` deja ver sólo los orígenes donde tiene `cotizaciones.configurar` (D7: `params` no viaja a nadie más). Nombra sus columnas: de `params` sólo
// los nodos pedidos (`->`, el valor JSON tal cual: un número llega como número).
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import type { ValorPorDefecto } from '../../entities/formula/ajuste'

type Cliente = SupabaseClient<Database>

// Los nodos llegan validados (`esquemaId`: minúsculas, dígitos y `_`), así que van tal cual en el `select`; cada uno con un alias propio (`v0`, `v1`).
const columnas = (nodos: readonly string[]) =>
  ['id', 'version', ...nodos.map((nodo, i) => `v${String(i)}:params->${nodo}`)].join(', ')

// La publicada de un origen: a lo sumo una fila, por `formulas_publicada_unica (origen_id) where estado = 'publicada'` (índice único parcial).
export function consultaDelValorPorDefecto(
  cliente: Cliente,
  origenId: string,
  nodos: readonly string[],
) {
  return cliente
    .from('formulas')
    .select(columnas(nodos))
    .eq('origen_id', origenId)
    .eq('estado', 'publicada')
    .limit(1)
}

const esquemaDeLaFila = z.looseObject({ id: z.guid(), version: z.number().int() })

export async function leerValorPorDefectoSobre(
  cliente: Cliente,
  origenId: string,
  nodos: readonly string[],
): Promise<Resultado<ValorPorDefecto | null>> {
  const { data, error } = await consultaDelValorPorDefecto(cliente, origenId, nodos)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas: unknown[] = Array.isArray(data) ? data : []
  const [primera] = filas
  if (primera === undefined) {
    return ok(null)
  }
  const fila = esquemaDeLaFila.safeParse(primera)
  if (!fila.success) {
    return fallo('inesperado', 'No pudimos leer la fórmula publicada.')
  }
  const valores = Object.fromEntries(
    nodos.map((nodo, i) => {
      const valor = fila.data[`v${String(i)}`]
      return [nodo, typeof valor === 'number' && Number.isFinite(valor) ? valor : null]
    }),
  )
  return ok({ publicadaId: fila.data.id, version: fila.data.version, valores })
}
