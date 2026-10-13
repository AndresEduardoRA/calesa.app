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
  creadoPor: string | null
  creadoEn: string
  // La versión de la fila: toda edición la manda.
  actualizadoEn: string
}

// Las columnas que pide `vehiculosDesde()`. Sin `apibara_raw` ni lo de la vitrina.
export const COLUMNAS_DE_VEHICULO =
  'id, numero, origen_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta, placado, kilometraje, categoria_id, fase_id, atributos, creado_por, creado_en, actualizado_en'

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
    creadoPor: fila.creado_por,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  }))
}
