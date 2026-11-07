// El tipo de cambio que nombra un nodo de una versión de la fórmula (4.20-3c; lo monta el ⚙ de una celda de tipo de cambio en el 4.20-3d), sobre el cliente que recibe:
// el del navegador, con la sesión de quien abre el ⚙. `formula_tipo_cambio_del_nodo()` pide `empresa.tipos_cambio.gestionar` y que quien llama vea el nodo; lee la
// versión por `formulas_pkey` (dos veces: ella y `_nodos_visibles`) y la fila por `tipos_cambio_clave_key`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import type { TipoCambioDelNodo } from '../../entities/formula/tipo-cambio'

type Cliente = SupabaseClient<Database>

// `actualizado_en` queda como texto: es la versión que compara `tipo_cambio_guardar` y `Date` pierde los microsegundos.
const esquemaDeLaFila = z.object({
  id: z.guid(),
  clave: z.string().min(1),
  nombre: z.string(),
  moneda_de: z.string().min(1),
  moneda_a: z.string().min(1),
  valor: z.number().positive().finite(),
  activo: z.boolean(),
  actualizado_en: z.string().min(1),
})

export async function leerTipoCambioDelNodoSobre(
  cliente: Cliente,
  formulaId: string,
  nodo: string,
): Promise<Resultado<TipoCambioDelNodo | null>> {
  const { data, error } = await cliente.rpc('formula_tipo_cambio_del_nodo', {
    p_formula: formulaId,
    p_nodo: nodo,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const fila = esquemaDeLaFila.safeParse(data)
  if (!fila.success) {
    return fallo('inesperado', 'No pudimos leer el tipo de cambio.')
  }
  const f = fila.data
  return ok({
    id: f.id,
    clave: f.clave,
    nombre: f.nombre,
    monedaDe: f.moneda_de,
    monedaA: f.moneda_a,
    valor: f.valor,
    activo: f.activo,
    actualizadoEn: f.actualizado_en,
  })
}
