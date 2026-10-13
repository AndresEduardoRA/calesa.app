import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { fotoEliminadaDesde } from '../entities/foto'
import type { RepositorioFotos } from '../entities/repositorios'

// Las cuatro RPC que escriben las fotos de un vehículo. Los mensajes de la base llegan tal cual
// a la pantalla: `errorDePostgrest()` sólo les pone el código (`PT409` → conflicto).

const agregadas = z.object({
  actualizado_en: z.string().nullable(),
  agregadas: z.array(z.string()),
  repetidas: z.array(z.string()),
  sin_lugar: z.array(z.string()),
})
const version = z.object({ actualizado_en: z.string() })
const eliminada = z.object({ actualizado_en: z.string().nullable(), foto: z.unknown() })

const agregar: RepositorioFotos['agregar'] = async ({ vehiculoId, fotos }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_fotos_agregar', {
    p_vehiculo: vehiculoId,
    p_fotos: fotos.map((foto) => ({
      hash: foto.hash,
      ruta: foto.ruta,
      ruta_miniatura: foto.rutaMiniatura,
      ancho: foto.ancho,
      alto: foto.alto,
      bytes: foto.bytes,
      ...(foto.orden === undefined ? {} : { orden: foto.orden }),
      ...(foto.esPortada === undefined ? {} : { es_portada: foto.esPortada }),
    })),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = agregadas.parse(data)
  return ok({
    actualizadoEn: fila.actualizado_en,
    agregadas: fila.agregadas,
    repetidas: fila.repetidas,
    sinLugar: fila.sin_lugar,
  })
}

const mover: RepositorioFotos['mover'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_foto_mover', {
    p_vehiculo: pedido.vehiculoId,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_foto: pedido.fotoId,
    // La RPC distingue «primera» por la ausencia del parámetro (su valor por defecto es nulo).
    ...(pedido.despuesDe ? { p_despues_de: pedido.despuesDe } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: version.parse(data).actualizado_en })
}

const fijarPortada: RepositorioFotos['fijarPortada'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_foto_portada', {
    p_vehiculo: pedido.vehiculoId,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_foto: pedido.fotoId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: version.parse(data).actualizado_en })
}

const eliminar: RepositorioFotos['eliminar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_foto_eliminar', {
    p_vehiculo: pedido.vehiculoId,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_foto: pedido.fotoId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = eliminada.parse(data)
  return ok({ actualizadoEn: fila.actualizado_en, foto: fotoEliminadaDesde(fila.foto) })
}

export const fotosSupabase: RepositorioFotos = { agregar, mover, fijarPortada, eliminar }
