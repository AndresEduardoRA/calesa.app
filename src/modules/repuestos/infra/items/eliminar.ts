import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { rechazoDeItem } from '../../entities/items/errores'
import type { RepositorioDeItems } from '../../entities/items/repositorio'

// Eliminar un ítem es sólo por RPC (`repuesto_item_eliminar`, 8.08-1): pide la versión que se vio (`PT409` si cambió o ya no existe) y rechaza con `23514` y `en_uso` si el ítem ya tiene historial,
// documentos, compras, gastos o stock, con el motivo escrito. Es un borrado lógico (`eliminado_en`).
export const eliminarItemSupabase: RepositorioDeItems['eliminar'] = async ({
  id,
  actualizadoEn,
}) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('repuesto_item_eliminar', {
    p_item: id,
    p_actualizado_en_esperado: actualizadoEn,
  })
  return error ? rechazoDeItem(error) : { ok: true, data: { id } }
}
