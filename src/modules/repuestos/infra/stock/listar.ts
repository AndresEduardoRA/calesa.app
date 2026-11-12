import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_PAGINA_POR_DEFECTO } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { filasDeStockDesde, paginaDeStock, type PaginaDeStock } from '../../entities/stock/listado'

const NO_SE_LEYO = 'No se pudo cargar el stock de repuestos.'

// La vista «Stock» de `/repuestos` (8.10-1; la dibuja 8.10-3) se lee con `repuestos_stock_listar()`, con la sesión de quien mira: sin `repuestos.ver` la base
// devuelve cero filas. Por cursor `(en_stock_desde, id)` sobre `repuestos_items_en_stock_idx`, una página de `TAMANO_DE_PAGINA_POR_DEFECTO` sin selector;
// la base suma la fila de más que dice si hay otra. Sin cursor, los dos tramos van nulos (la base exige los dos o ninguno); sus tipos generados no lo admiten.
const nuloParaLaBase = <T>(valor: T | null): T => valor as T

export async function leerStock(
  cursor: { en: string; id: string } | null,
): Promise<Resultado<PaginaDeStock>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuestos_stock_listar', {
    p_cursor_en: nuloParaLaBase(cursor?.en ?? null),
    p_cursor_id: nuloParaLaBase(cursor?.id ?? null),
    p_tamano: TAMANO_DE_PAGINA_POR_DEFECTO,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeStockDesde(data)
  return filas === null
    ? fallo('inesperado', NO_SE_LEYO)
    : ok(paginaDeStock(filas, TAMANO_DE_PAGINA_POR_DEFECTO))
}
