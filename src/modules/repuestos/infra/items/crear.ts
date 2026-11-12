import 'server-only'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO_EL_ITEM, rechazoDeItem } from '../../entities/items/errores'
import type { RepositorioDeItems } from '../../entities/items/repositorio'
import { leerItem } from './leer'

// Crear un ítem es sólo por RPC (`repuesto_item_crear`, 8.08-1): idempotente por `id`, pide `repuestos.editar`, valida los catálogos y rechaza con el `hint` de la columna (`descripcion`,
// `cantidad`, `precio_cliente`, `moneda`) o `proyecto` si está cerrado. Devuelve `{id, actualizado_en, fase_id}`; la fila entera, con su fase, se relee por su clave.
const esquemaDeCreado = z.object({ id: z.guid() })

async function crear({
  id,
  proyectoId,
  datos,
}: Parameters<RepositorioDeItems['crear']>[0]): ReturnType<RepositorioDeItems['crear']> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuesto_item_crear', {
    p_id: id,
    p_proyecto: proyectoId,
    p_datos: datos,
  })
  if (error) {
    return rechazoDeItem(error)
  }
  const creado = esquemaDeCreado.safeParse(data)
  if (!creado.success) {
    return { ok: false, error: { codigo: 'inesperado', mensaje: NO_SE_LEYO_EL_ITEM } }
  }
  const fila = await leerItem(creado.data.id)
  if (!fila.ok) {
    return fila
  }
  return fila.data === null
    ? { ok: false, error: { codigo: 'inesperado', mensaje: NO_SE_LEYO_EL_ITEM } }
    : { ok: true, data: fila.data }
}

export const crearItemSupabase = crear
