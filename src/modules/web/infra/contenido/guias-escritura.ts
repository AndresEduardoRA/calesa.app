import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest, MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { createClient, type ClienteSupabase } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import {
  MOTIVO_DE_SLUG_REPETIDO,
  MOTIVO_SIN_PERMISO_PARA_GUIAS,
  MOTIVO_SIN_PERMISO_PARA_PUBLICAR,
  fechaDePublicarYa,
} from '../../entities/contenido/guias'
import type {
  CamposDeGuia,
  EscritorDeGuias,
  PublicacionDeGuia,
} from '../../entities/contenido/repositorios'

type Fallo = { code?: string | null; message: string }

// Un error de la base → el valor que la pantalla muestra: el slug repetido junto a su campo, el documento rechazado junto al editor
// (`22023`, con el motivo de `_web_doc_html`), la falta de permiso con su texto.
function falloDe(error: Fallo, publica: boolean): ResultadoDeAccion<never> {
  const base = errorDePostgrest(error)
  if (error.code === '23505') {
    const mensaje = MOTIVO_DE_SLUG_REPETIDO
    return {
      ok: false as const,
      error: { codigo: 'duplicado' as const, mensaje },
      porCampo: { slug: mensaje },
    }
  }
  if (error.code === '22023') {
    return { ok: false as const, error: base, porCampo: { cuerpo: base.mensaje } }
  }
  if (error.code === '42501') {
    return {
      ok: false as const,
      error: {
        codigo: 'sin_permiso' as const,
        mensaje: publica ? MOTIVO_SIN_PERMISO_PARA_PUBLICAR : MOTIVO_SIN_PERMISO_PARA_GUIAS,
      },
    }
  }
  return { ok: false as const, error: base }
}

function filasDe(campos: CamposDeGuia) {
  return {
    titulo: campos.titulo,
    slug: campos.slug,
    resumen: campos.resumen,
    categoria_id: campos.categoriaId,
    autor_id: campos.autorId,
    portada_ruta: campos.portadaRuta,
    seo_titulo: campos.seoTitulo,
    seo_descripcion: campos.seoDescripcion,
    cuerpo_doc: campos.cuerpoDoc as Json | null,
  }
}

function publicadaEn(publicacion: PublicacionDeGuia): { publicada_en?: string | null } {
  switch (publicacion.tipo) {
    case 'mantener':
      return {}
    case 'publicar':
      return { publicada_en: fechaDePublicarYa(new Date()) }
    case 'programar':
      return { publicada_en: publicacion.cuando }
    case 'despublicar':
      return { publicada_en: null }
  }
}

// Cero filas: o ya no existe, o alguien la cambió (la versión no coincide).
async function sinFilas(supabase: ClienteSupabase, id: string) {
  const { data, error } = await supabase
    .from('web_guias')
    .select('id')
    .eq('id', id)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false as const, error: errorDePostgrest(error) }
  }
  return data
    ? {
        ok: false as const,
        error: {
          codigo: 'conflicto' as const,
          mensaje: 'Otra persona cambió esta guía mientras la editabas.',
        },
      }
    : {
        ok: false as const,
        error: { codigo: 'no_encontrado' as const, mensaje: 'Esta guía ya no existe.' },
      }
}

// Escribe `web_guias` directo: las policies (`web.contenido.gestionar`) y `trg_web_guia_publicar_validar` (`web.guias.publicar` sólo si cambia
// `publicada_en`) ya son el candado; el HTML y los minutos de lectura los pone `trg_web_guia_cuerpo`, nunca se mandan. La versión es
// `actualizado_en`: un `update … where actualizado_en = <esperado>` que no toca filas es un conflicto.
export const escritorDeGuias: EscritorDeGuias = {
  async crear({ titulo, slug }) {
    const supabase = await createClient()
    const { data: sesion } = await supabase.auth.getClaims()
    const persona = sesion?.claims.sub
    if (!persona) {
      return { ok: false, error: { codigo: 'no_autenticado', mensaje: MENSAJE_INESPERADO } }
    }
    const { data, error } = await supabase
      .from('web_guias')
      .insert({ titulo, slug, creado_por: persona })
      .select('id, actualizado_en')
      .single()
    if (error) {
      return falloDe(error, false)
    }
    return { ok: true, data: { id: data.id, actualizadoEn: data.actualizado_en } }
  },

  async guardar({ id, actualizadoEnEsperado, campos, publicacion }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_guias')
      .update({ ...filasDe(campos), ...publicadaEn(publicacion) })
      .eq('id', id)
      .eq('actualizado_en', actualizadoEnEsperado)
      .select('actualizado_en')
    if (error) {
      return falloDe(error, publicacion.tipo !== 'mantener')
    }
    const fila = data[0]
    return fila
      ? { ok: true, data: { actualizadoEn: fila.actualizado_en } }
      : sinFilas(supabase, id)
  },

  async eliminar({ id, actualizadoEnEsperado }) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_guias')
      .delete()
      .eq('id', id)
      .eq('actualizado_en', actualizadoEnEsperado)
      .select('id')
    if (error) {
      return falloDe(error, false)
    }
    return data.length > 0 ? { ok: true, data: null } : sinFilas(supabase, id)
  },
}
