import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_IMAGEN,
  MAXIMO_DE_IMAGENES_POR_ITEM,
  NO_SE_LEYERON_LAS_IMAGENES,
  imagenesDesde,
  planDeAgregado,
  type ImagenDeItem,
} from '../../entities/items/imagenes'
import type { RepositorioDeImagenes } from '../../entities/items/imagenes-repositorio'

// Las imágenes de un ítem para su panel (8.09-3, C5). `limit 9` (el tope más uno) sobre `repuestos_items_imagenes_item_id_idx`: ordena sólo las filas de un ítem, a lo más 8. La RLS
// (`repuestos.ver`) decide qué se ve; un ítem que no existe o no se ve vuelve vacío. Nunca con la hoja: sólo cuando se abre el panel.
export async function leerImagenesDeItem(itemId: string): Promise<Resultado<ImagenDeItem[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_items_imagenes')
    .select(COLUMNAS_DE_IMAGEN)
    .eq('item_id', itemId)
    .order('orden')
    .order('id')
    .limit(MAXIMO_DE_IMAGENES_POR_ITEM + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (!Array.isArray(data)) {
    return fallo('inesperado', NO_SE_LEYERON_LAS_IMAGENES)
  }
  return ok(imagenesDesde(data))
}

// Agregar: sólo las rutas que caben y que no están (`planDeAgregado`); la base vuelve a imponer el tope bajo su candado, la carpeta del ítem, el objeto subido y el proyecto abierto, y rechaza con
// su mensaje (`23514`, o `P0001` si la limpieza ya reclamó la ruta). Un solo `insert` con las filas: o entran todas o ninguna. `orden` lo pone la base.
async function agregar({
  itemId,
  rutas,
}: Parameters<RepositorioDeImagenes['agregar']>[0]): ReturnType<RepositorioDeImagenes['agregar']> {
  const antes = await leerImagenesDeItem(itemId)
  if (!antes.ok) {
    return antes
  }
  const plan = planDeAgregado({ existentes: antes.data.map((i) => i.ruta), pedidas: rutas })
  const supabase = await createClient()
  if (plan.aGuardar.length > 0) {
    const { error } = await supabase
      .from('repuestos_items_imagenes')
      .insert(plan.aGuardar.map((ruta) => ({ item_id: itemId, ruta })))
      .select('id')
      .limit(MAXIMO_DE_IMAGENES_POR_ITEM)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
  }
  const despues = await leerImagenesDeItem(itemId)
  if (!despues.ok) {
    return despues
  }
  return {
    ok: true,
    data: {
      imagenes: despues.data,
      agregadas: plan.aGuardar.length,
      repetidas: plan.repetidas.length,
      sinLugar: plan.sinLugar.length,
    },
  }
}

// Quitar: `delete` por clave primaria con `select` para devolver la ruta (el «Deshacer» la vuelve a registrar). Cero filas = «ya no está», éxito. La RLS (`repuestos.editar` y `repuestos.ver`) y el
// trigger `repuestos_imagen_quitar` (ítem vivo, proyecto abierto: 23514 con su mensaje) son el límite; el objeto lo encola la base (`repuestos_imagen_encolar`).
async function quitar(imagenId: string): ReturnType<RepositorioDeImagenes['quitar']> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_items_imagenes')
    .delete()
    .eq('id', imagenId)
    .select('id, ruta')
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const borrada = Array.isArray(data) ? data[0] : undefined
  const ruta = borrada && typeof borrada.ruta === 'string' ? borrada.ruta : null
  return { ok: true, data: { id: imagenId, ruta } }
}

export const imagenesSupabase: RepositorioDeImagenes = {
  listar: leerImagenesDeItem,
  agregar,
  quitar,
}
