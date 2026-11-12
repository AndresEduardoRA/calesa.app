import 'server-only'
import { cache } from 'react'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { createClient } from '@/shared/lib/supabase/server'
import {
  MINIMO_DE_BUSQUEDA_DE_GUIAS,
  TOPE_DE_GUIAS,
  type GuiaCompleta,
  type GuiaDeLista,
} from '../../entities/contenido/guias'
import type { LectorDeGuia, LectorDeGuias } from '../../entities/contenido/repositorios'

// `ilike` con `%`, `_` y `\` del texto como letras, no como comodines.
function comoTexto(buscar: string): string {
  return buscar.replace(/[\\%_]/g, (letra) => `\\${letra}`)
}

// La lista de guías: columnas de lista, de la más reciente a la más antigua, `tope + 1` filas (`web_guias` es de configuración: cientos a lo
// sumo, sin índice propio; el orden y el filtro por título recorren la tabla chica). Con un texto que no alcanza el mínimo no se filtra.
export const getGuias: LectorDeGuias = async ({ buscar }) => {
  const supabase = await createClient()
  let consulta = supabase
    .from('web_guias')
    .select(
      'id, titulo, slug, publicada_en, actualizado_en, categoria:web_categorias_guias(nombre), autor:perfiles!autor_id(nombre)',
    )
  if (buscar !== null && cumpleElMinimo(buscar, MINIMO_DE_BUSQUEDA_DE_GUIAS)) {
    consulta = consulta.ilike('titulo', `%${comoTexto(buscar.trim())}%`)
  }
  const { data, error } = await consulta
    .order('actualizado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_GUIAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas: GuiaDeLista[] = data.map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    slug: fila.slug,
    categoria: fila.categoria?.nombre ?? null,
    autor: fila.autor?.nombre ?? null,
    publicadaEn: fila.publicada_en,
    actualizadoEn: fila.actualizado_en,
  }))
  return ok(cortarAlTope(filas, TOPE_DE_GUIAS))
}

// La guía entera con su documento y su versión (`actualizado_en` tal como la dio la base), o `null` si ya no existe. Si falla, falla: la
// página muestra el error y no un formulario vacío que se guardaría encima.
export const getGuia: LectorDeGuia = cache(async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('web_guias')
    .select(
      'id, titulo, slug, resumen, cuerpo_doc, portada_ruta, categoria_id, autor_id, seo_titulo, seo_descripcion, publicada_en, actualizado_en',
    )
    .eq('id', id)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (!data) {
    return ok(null)
  }
  const guia: GuiaCompleta = {
    id: data.id,
    titulo: data.titulo,
    slug: data.slug,
    resumen: data.resumen,
    cuerpoDoc: data.cuerpo_doc,
    portadaRuta: data.portada_ruta,
    categoriaId: data.categoria_id,
    autorId: data.autor_id,
    seoTitulo: data.seo_titulo,
    seoDescripcion: data.seo_descripcion,
    publicadaEn: data.publicada_en,
    actualizadoEn: data.actualizado_en,
  }
  return ok(guia)
})
