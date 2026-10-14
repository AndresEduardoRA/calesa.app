// El catálogo de apibara: cada dato normalizado que devuelve la API, con su ruta aplanada
// (`vehicle_specs.engine.raw`) como `clave_apibara`. Es lo que nace con un origen de subasta, todo
// encendido, y lo que `origen_apibara_completar()` suma a los que ya existían.
//
// Espejo de `_apibara_catalogo()` (supabase/migrations/20261014000200_apibara.sql): sirve para
// decir qué va a nacer y para que las pruebas sepan qué ruta llena qué clave.
// `catalogo-apibara.test.ts` lee el SQL y falla si divergen. Lo que NO es campo y queda sólo en
// la respuesta guardada: `details`, las listas, lo que caduca al minuto, los duplicados y lo que
// ya es columna de `vehiculos` (título, marca, modelo, año, VIN, lote, plataforma, kilometraje y
// la fecha de la subasta).

import { DE_SIEMPRE, EXTRAS } from './catalogo-apibara-datos'

export type DatoDelCatalogo = {
  clave: string
  etiqueta: string
  tipo: string
  grupo: string
  orden: number
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  // La ruta en la respuesta de apibara; null = dato que la API no trae (campo manual).
  claveApibara: string | null
  // Los 17 de siempre: no se borran ni cambian de tipo.
  esSistema: boolean
}

const PRIMER_ORDEN_EXTRA = 200

export const CATALOGO_APIBARA: readonly DatoDelCatalogo[] = [
  ...DE_SIEMPRE.map(
    ([clave, etiqueta, tipo, grupoDelCampo, enTarjeta, filtrable, publicoWeb, ruta], indice) => ({
      clave,
      etiqueta,
      tipo,
      grupo: grupoDelCampo,
      orden: (indice + 1) * 10,
      enTarjeta,
      filtrable,
      publicoWeb,
      claveApibara: ruta,
      esSistema: true,
    }),
  ),
  ...EXTRAS.flatMap(([nombre, datos]) => datos.map((dato) => ({ nombre, dato }))).map(
    ({ nombre, dato: [clave, etiqueta, tipo, ruta] }, indice) => ({
      clave,
      etiqueta,
      tipo,
      grupo: nombre,
      orden: PRIMER_ORDEN_EXTRA + indice * 10,
      enTarjeta: false,
      filtrable: false,
      publicoWeb: false,
      claveApibara: ruta,
      esSistema: false,
    }),
  ),
]

// Las secciones del formulario y de la ficha, en el orden en que nacen.
export const GRUPOS_DEL_CATALOGO: readonly string[] = [
  ...new Set(CATALOGO_APIBARA.map((dato) => dato.grupo)),
]

const RUTAS_IGNORADAS: readonly string[] = [
  'title',
  'make',
  'model',
  'year',
  'vin',
  'lot_number',
  'platform',
  'platform_id',
  'odometer.km',
  'auction.auction_at',
  'auction.diff_minutes',
  'auction.formatted',
  'auction.ad',
  'auction.full_date',
  'ad',
  'distance',
  'media.items_count',
  'seller.class',
  'seller.text_class',
  'condition.run_condition.class_hint',
]

// Lo que de la respuesta no se ofrece como campo: ya es una columna de `vehiculos`, es un duplicado,
// caduca al minuto o es pura forma (`details`, las listas). Espejo de `_apibara_ruta_ignorada()`.
export function rutaIgnorada(ruta: string): boolean {
  return (
    RUTAS_IGNORADAS.includes(ruta) ||
    ruta === 'details' ||
    ruta.startsWith('details.') ||
    ruta.startsWith('auction.countdown.') ||
    ruta.startsWith('media.items') ||
    ruta === 'media.thumbs' ||
    ruta.startsWith('media.thumbs.')
  )
}
