// Un vehículo del inventario. Los datos comunes son columnas; lo que cambia de un origen a otro
// vive en `atributos`, descrito por el layout de campos de su origen.
import { z } from 'zod'

export type Atributos = Record<string, unknown>

export type Vehiculo = {
  id: string
  numero: number
  origenId: string
  titulo: string
  marca: string | null
  modelo: string | null
  anio: number | null
  vin: string | null
  lote: string | null
  plataforma: string | null
  urlOrigen: string | null
  precio: number | null
  precioNegociable: boolean | null
  aceptaPermuta: boolean | null
  placado: boolean | null
  kilometraje: number | null
  categoriaId: string | null
  // null = «Sin fase»: todavía no entró al flujo de su origen.
  faseId: string | null
  atributos: Atributos
  // El vínculo activo: el lead dueño o comprador. Con alcance «propios», quien lo tiene en su
  // cartera ve y edita el vehículo.
  leadId: string | null
  // La marca de la vitrina y su precio público (null = «Consultar»). Que además se vea en la web
  // depende de la fase y del origen: ver `entities/vitrina.ts`.
  publicadoWeb: boolean
  destacadoWeb: boolean
  precioWeb: number | null
  precioWebHasta: number | null
  precioWebNota: string | null
  // El día (`YYYY-MM-DD`, en la zona de la empresa) en que la limpieza automática lo va a mandar a
  // la papelera; null = hoy no hay fecha (no le toca, está apagada o tiene una ancla). Lo calcula
  // la base: ver `entities/limpieza.ts`.
  limpiezaEl: string | null
  // La miniatura de la foto de portada (ruta en el bucket `vehiculos`); null = sin fotos.
  portadaRuta: string | null
  creadoPor: string | null
  creadoEn: string
  // La versión de la fila: toda edición la manda.
  actualizadoEn: string
}

// El máximo de filas por página del inventario (el selector ofrece hasta acá): lo que cabe dentro del presupuesto de
// `docs/RENDIMIENTO.md`. El tamaño que se lee sale de `tamanoDePagina()` de `shared/lib/paginacion`.
export const MAXIMO_DE_PAGINA_DE_VEHICULOS = 100

// Las columnas que pide `vehiculosDesde()`. Sin `apibara_raw`. Las fotos
// vienen embebidas en la misma consulta; quien consulta las acota a la portada con
// `FILTRO_DE_PORTADA` (sin ese filtro vendrían las 24).
export const COLUMNAS_DE_VEHICULO =
  'id, numero, origen_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta, placado, kilometraje, categoria_id, fase_id, atributos, lead_id, publicado_web, destacado_web, precio_web, precio_web_hasta, precio_web_nota, creado_por, creado_en, actualizado_en, limpieza_el, vehiculos_imagenes(ruta_miniatura)'

export const FILTRO_DE_PORTADA = { columna: 'vehiculos_imagenes.es_portada', valor: true } as const

const esquemaVehiculos = z.array(
  z.object({
    id: z.guid(),
    numero: z.number(),
    origen_id: z.guid(),
    titulo: z.string(),
    marca: z.string().nullable(),
    modelo: z.string().nullable(),
    anio: z.number().nullable(),
    vin: z.string().nullable(),
    lote: z.string().nullable(),
    plataforma: z.string().nullable(),
    url_origen: z.string().nullable(),
    precio: z.number().nullable(),
    precio_negociable: z.boolean().nullable(),
    acepta_permuta: z.boolean().nullable(),
    placado: z.boolean().nullable(),
    kilometraje: z.number().nullable(),
    categoria_id: z.guid().nullable(),
    fase_id: z.guid().nullable(),
    // Unos atributos ilegibles no tumban la lista: ese vehículo se muestra sin ellos.
    atributos: z.record(z.string(), z.unknown()).catch({}),
    lead_id: z.guid().nullable(),
    publicado_web: z.boolean(),
    destacado_web: z.boolean(),
    precio_web: z.number().nullable(),
    precio_web_hasta: z.number().nullable(),
    precio_web_nota: z.string().nullable(),
    // Columna calculada de la base (`limpieza_el()`); nunca tumba la lista.
    limpieza_el: z.string().nullable().catch(null),
    // A lo sumo una: la portada. Sin fotos (o si no llegaron) el vehículo se muestra sin ella.
    vehiculos_imagenes: z.array(z.object({ ruta_miniatura: z.string() })).catch([]),
    creado_por: z.guid().nullable(),
    creado_en: z.string(),
    actualizado_en: z.string(),
  }),
)

// En el orden en que llegaron: el orden es de la consulta.
export function vehiculosDesde(filas: unknown): Vehiculo[] {
  return esquemaVehiculos.parse(filas).map((fila) => ({
    id: fila.id,
    numero: fila.numero,
    origenId: fila.origen_id,
    titulo: fila.titulo,
    marca: fila.marca,
    modelo: fila.modelo,
    anio: fila.anio,
    vin: fila.vin,
    lote: fila.lote,
    plataforma: fila.plataforma,
    urlOrigen: fila.url_origen,
    precio: fila.precio,
    precioNegociable: fila.precio_negociable,
    aceptaPermuta: fila.acepta_permuta,
    placado: fila.placado,
    kilometraje: fila.kilometraje,
    categoriaId: fila.categoria_id,
    faseId: fila.fase_id,
    atributos: fila.atributos,
    leadId: fila.lead_id,
    publicadoWeb: fila.publicado_web,
    destacadoWeb: fila.destacado_web,
    precioWeb: fila.precio_web,
    precioWebHasta: fila.precio_web_hasta,
    precioWebNota: fila.precio_web_nota,
    limpiezaEl: fila.limpieza_el,
    portadaRuta: fila.vehiculos_imagenes[0]?.ruta_miniatura ?? null,
    creadoPor: fila.creado_por,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  }))
}
