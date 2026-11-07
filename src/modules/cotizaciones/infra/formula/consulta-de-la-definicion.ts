// La definición de una versión de la fórmula para editarla (4.21-3a-1), sobre el cliente que recibe: el del navegador, con la sesión de quien abre el editor. La
// policy `formulas: leer` deja ver sólo los orígenes donde tiene `cotizaciones.configurar` (D7: `definicion` y `params` no viajan a nadie más); una fila que no
// vuelve (se descartó, o quien mira dejó de configurar el origen) es nula, sin distinguir.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import { esquemaFormula } from '../../entities/formula'
import type { FormulaParaEditar } from '../../entities/formula/edicion'

type Cliente = SupabaseClient<Database>

// Una fila por su id: `formulas_pkey (id)`.
export function consultaDeLaDefinicion(cliente: Cliente, formulaId: string) {
  return cliente
    .from('formulas')
    .select('id, definicion, params, actualizado_en')
    .eq('id', formulaId)
    .limit(1)
}

const esquemaDeLaFila = z.strictObject({
  id: z.guid(),
  definicion: z.unknown(),
  params: z.unknown(),
  actualizado_en: z.string(),
})

// La forma (el Zod de `formula.ts`) se exige aquí: lo que no la tiene no se puede editar. Las reglas que cruzan nodos (`validarFormula()`) las mira el editor,
// que dice el rechazo en su fila.
export async function leerDefinicionSobre(
  cliente: Cliente,
  formulaId: string,
): Promise<Resultado<FormulaParaEditar | null>> {
  const { data, error } = await consultaDeLaDefinicion(cliente, formulaId)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas: unknown[] = Array.isArray(data) ? data : []
  const [primera] = filas
  if (primera === undefined) {
    return ok(null)
  }
  const fila = esquemaDeLaFila.safeParse(primera)
  const formula = fila.success
    ? esquemaFormula.safeParse({ definicion: fila.data.definicion, params: fila.data.params })
    : null
  if (!fila.success || !formula?.success) {
    return fallo('inesperado', 'No pudimos leer la fórmula.')
  }
  return ok({ id: fila.data.id, actualizadoEn: fila.data.actualizado_en, formula: formula.data })
}
