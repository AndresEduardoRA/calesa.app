import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  categoriasDesde,
  SIN_PERMISO_PARA_LAS_CATEGORIAS,
  textoDeErrorDeCategoria,
  type CategoriaDeGasto,
} from '../../entities/dinero/categoria'
import type { RepositorioDeCategorias } from '../../entities/dinero/repositorio-de-categorias'
import { inesperado } from './rpc'

// Las categorías de gasto son un catálogo de la empresa (decenas de filas): se escriben directo, con el cliente de quien pide, y el límite es la RLS (`logistica.catalogos.gestionar`). No otorgan
// permisos, así que no hay RPC (6.11-4, D9). Una escritura que la RLS deja en cero filas es «sin permiso», nunca éxito.
const COLUMNAS = 'id, nombre, proposito, activo, orden'

type ErrorDeLaBase = { code?: string | null; message: string }

function rechazo(error: ErrorDeLaBase, nombre: string): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  const texto = error.code ? textoDeErrorDeCategoria(error.code, nombre) : null
  const porCampo = error.code === '23505' && texto ? { nombre: texto } : undefined
  return {
    ok: false,
    error: texto ? { ...app, mensaje: texto } : app,
    ...(porCampo ? { porCampo } : {}),
  }
}

const sinPermiso = (): ResultadoDeAccion<never> => ({
  ok: false,
  error: { codigo: 'sin_permiso', mensaje: SIN_PERMISO_PARA_LAS_CATEGORIAS },
})

function unaCategoria(datos: unknown): ResultadoDeAccion<CategoriaDeGasto> {
  const lista = categoriasDesde(datos)
  const una = lista?.[0]
  if (lista === null) {
    return inesperado()
  }
  return una ? { ok: true, data: una } : sinPermiso()
}

export const categoriasSupabase: RepositorioDeCategorias = {
  crear: async (datos) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categorias_gasto')
      .insert(datos)
      .select(COLUMNAS)
      .limit(1)
    return error ? rechazo(error, datos.nombre) : unaCategoria(data)
  },
  guardar: async ({ id, nombre, cambios }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categorias_gasto')
      .update(cambios)
      .eq('id', id)
      .select(COLUMNAS)
      .limit(1)
    return error ? rechazo(error, cambios.nombre ?? nombre) : unaCategoria(data)
  },
  eliminar: async ({ id, nombre }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categorias_gasto')
      .delete()
      .eq('id', id)
      .select('id')
      .limit(1)
    if (error) {
      return rechazo(error, nombre)
    }
    return data.length > 0 ? { ok: true, data: { id } } : sinPermiso()
  },
}
