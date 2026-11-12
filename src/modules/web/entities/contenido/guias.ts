// Las guías del sitio (8.03-1): las reglas puras de la lista, del alta y de la publicación. La base decide (`web_guias`, sus policies y
// `trg_web_guia_publicar_validar`); esto sólo explica en la pantalla. El HTML lo deriva la base del documento (`cuerpo_doc`).
import type { MinimoDeBusqueda } from '@/shared/lib/filtros'
import { RUTAS } from '@/shared/lib/rutas'
import { htmlDelDocumento } from './doc'
import { esObjeto } from './doc-nodos'

export type EstadoDeGuia = 'borrador' | 'programada' | 'publicada'

// Una fila de la lista de guías.
export type GuiaDeLista = {
  id: string
  titulo: string
  slug: string
  categoria: string | null
  autor: string | null
  publicadaEn: string | null
  actualizadoEn: string
}

// La guía entera, para su página. `cuerpoDoc` es el documento tal como lo guardó la base (se reduce a la lista blanca al abrirlo).
export type GuiaCompleta = {
  id: string
  titulo: string
  slug: string
  resumen: string | null
  cuerpoDoc: unknown
  portadaRuta: string | null
  categoriaId: string | null
  autorId: string | null
  seoTitulo: string | null
  seoDescripcion: string | null
  publicadaEn: string | null
  // La versión tal como la dio la base (con sus microsegundos): nunca pasa por `Date`.
  actualizadoEn: string
}

export type OpcionDeGuia = { id: string; nombre: string }

// Las listas de los selectores de la guía: categorías (activas, más la actual) y autores, cada una leída con tope + 1.
export type OpcionesDeGuia = {
  categorias: readonly (OpcionDeGuia & { activa: boolean })[]
  autores: readonly OpcionDeGuia[]
  hayMasCategorias: boolean
  hayMasAutores: boolean
}

export const TOPE_DE_GUIAS = 100
export const TOPE_DE_OPCIONES_DE_GUIA = 100
export const MAXIMO_DEL_TITULO_DE_GUIA = 150
export const MAXIMO_DEL_SLUG_DE_GUIA = 80
export const MAXIMO_DEL_RESUMEN_DE_GUIA = 300
export const MAXIMO_DEL_SEO_TITULO = 70
export const MAXIMO_DEL_SEO_DESCRIPCION = 200
// Una guía programada ya debe haber pasado el reloj de la base: «ahora» se publica un minuto antes.
export const SEGUNDOS_DE_MARGEN_AL_PUBLICAR = 60
export const MINUTOS_MINIMOS_PARA_PROGRAMAR = 1

export const MINIMO_DE_BUSQUEDA_DE_GUIAS: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras para buscar.',
}

export const MOTIVO_SIN_PERMISO_PARA_PUBLICAR = 'Tu rol no publica guías.'
export const MOTIVO_SIN_PERMISO_PARA_GUIAS = 'No tienes permiso para cambiar las guías.'
export const MOTIVO_SIN_TEXTO_PARA_PUBLICAR = 'Escribe el texto de la guía para publicarla.'
export const MOTIVO_SIN_CONEXION_PARA_PUBLICAR = 'No hay conexión.'
export const MOTIVO_DE_SLUG_REPETIDO = 'Ya hay una guía con esa dirección. Cambia el texto.'
export const MOTIVO_DE_FECHA_PASADA = 'Elige una fecha futura.'

// La guía de la lista y de la página: el estado se calcula al leer (`ahora` viene de después de la consulta).
export function estadoDeGuia(publicadaEn: string | null, ahora: Date): EstadoDeGuia {
  if (publicadaEn === null) {
    return 'borrador'
  }
  return new Date(publicadaEn).getTime() <= ahora.getTime() ? 'publicada' : 'programada'
}

// La dirección de la guía en el sitio: minúsculas, sin tildes, sólo letras, números y guiones, de hasta 80 caracteres. Sólo símbolos → vacío.
export function slugDe(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
  return base.slice(0, MAXIMO_DEL_SLUG_DE_GUIA).replace(/-+$/, '')
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function esSlugValido(slug: string): boolean {
  return slug.length >= 1 && slug.length <= MAXIMO_DEL_SLUG_DE_GUIA && SLUG.test(slug)
}

// El documento tiene algo que mostrar (texto o una imagen); si la lista blanca lo rechaza, el motivo va junto al editor.
export function tieneCuerpo(documento: unknown): boolean {
  const html = htmlDelDocumento(documento)
  return html.ok && html.html !== ''
}

export type PuedePublicar = { ok: true } | { ok: false; motivo: string }

// Publicar, programar: con el permiso, con texto y con red, en ese orden. Despublicar sólo pide el permiso (`web.guias.publicar`).
export function puedePublicar(situacion: {
  permitido: boolean
  conCuerpo: boolean
  enLinea: boolean
}): PuedePublicar {
  if (!situacion.permitido) {
    return { ok: false, motivo: MOTIVO_SIN_PERMISO_PARA_PUBLICAR }
  }
  if (!situacion.conCuerpo) {
    return { ok: false, motivo: MOTIVO_SIN_TEXTO_PARA_PUBLICAR }
  }
  if (!situacion.enLinea) {
    return { ok: false, motivo: MOTIVO_SIN_CONEXION_PARA_PUBLICAR }
  }
  return { ok: true }
}

// «Publicar» pone la fecha de un minuto antes: el reloj de Next no es el de la base y con «ahora» exacto la guía saldría «Programada».
export function fechaDePublicarYa(ahora: Date): string {
  return new Date(ahora.getTime() - SEGUNDOS_DE_MARGEN_AL_PUBLICAR * 1000).toISOString()
}

// «Programar»: la fecha tiene que quedar al menos un minuto adelante.
export function esFechaDeProgramar(iso: string, ahora: Date): boolean {
  const cuando = new Date(iso).getTime()
  return (
    Number.isFinite(cuando) && cuando - ahora.getTime() >= MINUTOS_MINIMOS_PARA_PROGRAMAR * 60_000
  )
}

export function rutaDeGuia(id: string): string {
  return `${RUTAS.configuracionDeWeb}/guias/${id}`
}

export const RUTA_DE_LA_LISTA_DE_GUIAS = `${RUTAS.configuracionDeWeb}?seccion=guias`

// Las rutas de las imágenes del primer nivel de un documento (la base no las admite más adentro), sin repetir: lo que ya no está tras guardar se
// quita del bucket si ninguna fila lo usa (`quitarSiHuerfano`).
export function rutasDeImagenes(documento: unknown): string[] {
  const contenido = esObjeto(documento) ? documento['content'] : undefined
  const rutas = (Array.isArray(contenido) ? contenido : []).flatMap((nodo): string[] => {
    const attrs = esObjeto(nodo) && nodo['type'] === 'image' ? nodo['attrs'] : undefined
    const ruta = esObjeto(attrs) ? attrs['ruta'] : undefined
    return typeof ruta === 'string' ? [ruta] : []
  })
  return [...new Set(rutas)]
}

// Qué botones de publicación tiene cada estado: borrador → Publicar y Programar; programada → Publicar ahora y Despublicar; publicada → Despublicar.
export function accionesDePublicacion(estado: EstadoDeGuia): {
  publicar: 'Publicar' | 'Publicar ahora' | null
  programar: boolean
  despublicar: boolean
} {
  return {
    publicar:
      estado === 'borrador' ? 'Publicar' : estado === 'programada' ? 'Publicar ahora' : null,
    programar: estado === 'borrador',
    despublicar: estado !== 'borrador',
  }
}

// El motivo a la vista bajo los botones: el de Publicar y Programar (permiso, texto, red) cuando el estado los ofrece; si no, el de Despublicar (sólo permiso).
export function motivoDePublicacion(
  estado: EstadoDeGuia,
  situacion: { permitido: boolean; conCuerpo: boolean; enLinea: boolean },
): string | null {
  if (estado === 'publicada') {
    return situacion.permitido ? null : MOTIVO_SIN_PERMISO_PARA_PUBLICAR
  }
  const puede = puedePublicar(situacion)
  return puede.ok ? null : puede.motivo
}
