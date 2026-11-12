import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient, type ClienteSupabase } from '@/shared/lib/supabase/server'
import {
  MOTIVO_DE_CATEGORIA_AUSENTE,
  MOTIVO_DE_CATEGORIA_REPETIDA,
  MOTIVO_DE_ELIMINAR_CON_GUIAS,
  MOTIVO_DE_TOPE_DE_CATEGORIAS,
  MOTIVO_NOMBRE_SIN_LETRAS,
  MOTIVO_SIN_PERMISO_PARA_CATEGORIAS,
  TOPE_DE_CATEGORIAS,
  ordenDeCategorias,
  slugDeCategoria,
} from '../../entities/contenido/categorias'
import type { EscritorDeCategorias } from '../../entities/contenido/repositorios'

type Fallo = { code?: string | null; message: string }

// Un error de la base → el valor que la pantalla muestra: el nombre repetido junto a su campo y la falta de permiso con su texto.
function falloDe(error: Fallo): ResultadoDeAccion<never> {
  if (error.code === '23505') {
    return {
      ok: false,
      error: { codigo: 'duplicado', mensaje: MOTIVO_DE_CATEGORIA_REPETIDA },
      porCampo: { nombre: MOTIVO_DE_CATEGORIA_REPETIDA },
    }
  }
  if (error.code === '42501') {
    return {
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_PARA_CATEGORIAS },
    }
  }
  return { ok: false, error: errorDePostgrest(error) }
}

const AUSENTE = {
  ok: false as const,
  error: { codigo: 'no_encontrado' as const, mensaje: MOTIVO_DE_CATEGORIA_AUSENTE },
}

// Las categorías (todas, hasta el tope + 1) por orden y nombre, tal como están ahora, para decidir un movimiento.
async function leerParaOrdenar(supabase: ClienteSupabase) {
  return supabase
    .from('web_categorias_guias')
    .select('id, slug, nombre, orden, activa')
    .order('orden')
    .order('nombre')
    .limit(TOPE_DE_CATEGORIAS + 1)
}

// Escribe `web_categorias_guias` directo: las policies (`web.contenido.gestionar`) son el candado. La tabla no tiene versión: la última
// escritura gana, y una fila que ya no está es «ya no existe». `web_guias.categoria_id` es `on delete set null`: que no se borre una con guías
// es regla de aquí, no de la base.
export const escritorDeCategorias: EscritorDeCategorias = {
  async crear({ nombre }) {
    const slug = slugDeCategoria(nombre)
    if (slug === null) {
      return {
        ok: false,
        error: { codigo: 'validacion', mensaje: MOTIVO_NOMBRE_SIN_LETRAS },
        porCampo: { nombre: MOTIVO_NOMBRE_SIN_LETRAS },
      }
    }
    const supabase = await createClient()
    const existentes = await supabase
      .from('web_categorias_guias')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(TOPE_DE_CATEGORIAS)
    if (existentes.error) {
      return falloDe(existentes.error)
    }
    if (existentes.data.length >= TOPE_DE_CATEGORIAS) {
      return {
        ok: false,
        error: { codigo: 'regla', mensaje: MOTIVO_DE_TOPE_DE_CATEGORIAS },
        porCampo: { nombre: MOTIVO_DE_TOPE_DE_CATEGORIAS },
      }
    }
    const mayor = existentes.data[0]?.orden ?? -1
    const { data, error } = await supabase
      .from('web_categorias_guias')
      .insert({ nombre, slug, orden: mayor + 1 })
      .select('id')
      .single()
    return error ? falloDe(error) : { ok: true, data: { id: data.id } }
  },

  async renombrar({ id, nombre }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_categorias_guias')
      .update({ nombre })
      .eq('id', id)
      .select('id')
    if (error) {
      return falloDe(error)
    }
    return data.length > 0 ? { ok: true, data: null } : AUSENTE
  },

  async activar({ id, activa }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_categorias_guias')
      .update({ activa })
      .eq('id', id)
      .select('id')
    if (error) {
      return falloDe(error)
    }
    return data.length > 0 ? { ok: true, data: null } : AUSENTE
  },

  // Lee la lista fresca, reescribe 0..n−1 y manda **un** `upsert` con sólo las filas que cambian (`slug` y `nombre` son `not null`: van
  // los de lo recién leído, que no cambian). Un renombrar simultáneo puede perderse en esa ventana de milisegundos: aceptado.
  async mover({ id, direccion }) {
    const supabase = await createClient()
    const lista = await leerParaOrdenar(supabase)
    if (lista.error) {
      return falloDe(lista.error)
    }
    if (!lista.data.some((fila) => fila.id === id)) {
      return AUSENTE
    }
    const cambios = ordenDeCategorias(lista.data, id, direccion)
    const filas = cambios.flatMap((cambio) => {
      const fila = lista.data.find((leida) => leida.id === cambio.id)
      return fila ? [{ ...fila, orden: cambio.orden }] : []
    })
    if (filas.length === 0) {
      return { ok: true, data: null }
    }
    const { error } = await supabase
      .from('web_categorias_guias')
      .upsert(filas, { onConflict: 'id' })
    return error ? falloDe(error) : { ok: true, data: null }
  },

  async eliminar({ id }) {
    const supabase = await createClient()
    const conGuias = await supabase.from('web_guias').select('id').eq('categoria_id', id).limit(1)
    if (conGuias.error) {
      return falloDe(conGuias.error)
    }
    if (conGuias.data.length > 0) {
      return { ok: false, error: { codigo: 'regla', mensaje: MOTIVO_DE_ELIMINAR_CON_GUIAS } }
    }
    const { data, error } = await supabase
      .from('web_categorias_guias')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) {
      return falloDe(error)
    }
    return data.length > 0 ? { ok: true, data: null } : AUSENTE
  },
}
