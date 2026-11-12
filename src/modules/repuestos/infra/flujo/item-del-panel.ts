import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DEL_ITEM_DEL_PANEL,
  itemDelPanelDesde,
  type ItemDelPanel,
} from '../../entities/flujo/item-del-panel'

// El ítem que abre su panel (8.13-2), por su clave y con la sesión de quien mira: una fila (`repuestos_items_pkey`). Nulo si el id no es válido, no existe, está en la papelera o la RLS no deja
// verlo (ni su proyecto, que `itemDelPanelDesde` deja en nulo): los tres se dicen igual, nunca se confirma que existe.
export async function leerItemDelPanel(id: string): Promise<Resultado<ItemDelPanel | null>> {
  if (!z.guid().safeParse(id).success) return ok(null)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_items')
    .select(COLUMNAS_DEL_ITEM_DEL_PANEL)
    .eq('id', id)
    .is('eliminado_en', null)
    .limit(1)
    .maybeSingle()
  if (error) return { ok: false, error: errorDePostgrest(error) }
  if (data === null) return ok(null)
  return itemDelPanelDesde(data)
}
