import 'server-only'
import { z } from 'zod'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioVitrina } from '../entities/repositorios'
import type { CampoDeVitrina } from '../entities/vitrina'

// Publicar y despublicar se escriben sólo por `vehiculo_vitrina()`: manda el estado entero y la
// versión del vehículo. Un rechazo de validación trae en `hint` la columna que lo causó.
const CAMPO_POR_COLUMNA: Record<string, CampoDeVitrina> = {
  precio_web: 'precio',
  precio_web_hasta: 'precioHasta',
  precio_web_nota: 'nota',
}

const guardado = z.object({ actualizado_en: z.string() })

// Los tipos generados no saben que un parámetro admite nulo: el precio nulo es «Consultar».
type Argumentos = {
  p_vehiculo: string
  p_actualizado_en_esperado: string
  p_publicado: boolean
  p_precio: number
  p_precio_hasta: number
  p_nota: string
  p_destacado: boolean
}

const publicar: RepositorioVitrina['publicar'] = async (pedido) => {
  const supabase = await createClient()
  const argumentos = {
    p_vehiculo: pedido.vehiculoId,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_publicado: pedido.publicado,
    p_precio: pedido.precio,
    p_precio_hasta: pedido.precioHasta,
    p_nota: pedido.nota,
    p_destacado: pedido.destacado,
  }
  const { data, error } = await supabase.rpc('vehiculo_vitrina', argumentos as Argumentos)
  if (error) {
    const campo = error.hint ? CAMPO_POR_COLUMNA[error.hint] : undefined
    return { ok: false, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
  }
  return { ok: true, data: { actualizadoEn: guardado.parse(data).actualizado_en } }
}

export const vitrinaSupabase: RepositorioVitrina = { publicar }
