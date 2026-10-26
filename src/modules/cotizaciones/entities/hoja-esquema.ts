import { z } from 'zod'
import { ANCHOS, EFECTOS_DE_INTERRUPTOR, PRESENTACIONES, SECUNDARIOS } from './diseno'
import { esquemaId, FORMATOS } from './nodos'

// Lo que la hoja de cotizar lee al abrir (paso 4.13, `cotizacion_hoja()` en `…20261019008900_cotizacion_hoja.sql`): el diseño publicado de un origen RECORTADO al nivel de
// quien mira, con lo que la hoja necesita para dibujarse sin otra consulta, la versión de la fórmula, la hora de la base y la hoja abierta firmada (`p_abierta` de
// `cotizacion_crear` y de `cotizacion_evaluar`, D2, 4-27 y 4-28) o el estado «sin publicar». Lo que la persona no ve no llega: ni su id, ni su etiqueta, ni su valor, ni su tono, ni su ayuda; lo que ve y no edita
// llega con su motivo. Este tipo es lo único que la pantalla conoce de la respuesta: lo que la base manda y no figura acá se cae al leerla (`z.object` no es estricto).

export const TIPOS_DE_NODO = [
  'input',
  'constante',
  'tipo_cambio',
  'campo_vehiculo',
  'bandera',
  'opcion',
  'tabla',
  'tramo',
  'calculo',
] as const
export type TipoDeNodoDeHoja = (typeof TIPOS_DE_NODO)[number]

// Por qué un monto no se edita: se calcula, es un dato del vehículo, su nivel de editar no es el de quien mira (con el nombre del nivel) o el diseño no deja editarlo.
export type MotivoDeCandado =
  { codigo: 'se_calcula' | 'del_vehiculo' | 'no_se_edita' } | { codigo: 'nivel'; nivel: string }

const esquemaMotivo = z.union([
  z.object({ codigo: z.enum(['se_calcula', 'del_vehiculo', 'no_se_edita']) }),
  z.object({ codigo: z.literal('nivel'), nivel: z.string().min(1) }),
])

// Se edita ⇔ no hay motivo: la base lo asegura en cada celda, variante, interruptor y secundario, y acá se vuelve a exigir.
const edicion = {
  editable: z.boolean(),
  motivo: esquemaMotivo.optional(),
}
const coherente = (e: { editable: boolean; motivo?: unknown }) =>
  e.editable !== (e.motivo !== undefined)
const ERROR_DE_MOTIVO = { error: 'Lo que se edita no lleva motivo y lo que no, sí.' }

const esquemaSecundario = z
  .object({
    nodo: esquemaId,
    como: z.enum(SECUNDARIOS),
    // El tipo del nodo del porcentaje (4-31): un `input` se edita en `inputs` y una constante en `overrides`; la hoja ya no lo adivina por la fuente de una respuesta.
    tipo_nodo: z.enum(TIPOS_DE_NODO),
    formato: z.enum(FORMATOS),
    ajustes: z.boolean(),
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

const esquemaAyuda = z.union([
  z.object({ tabla: esquemaId }),
  z.object({ texto: z.string().min(1) }),
])

export const esquemaCelda = z
  .object({
    tipo: z.literal('celda'),
    nodo: esquemaId,
    etiqueta: z.string().min(1),
    tipo_nodo: z.enum(TIPOS_DE_NODO),
    formato: z.enum(FORMATOS),
    ancho: z.enum(ANCHOS),
    tono: esquemaId.optional(),
    ajustes: z.boolean(),
    ayuda: esquemaAyuda.optional(),
    solo_en: z.array(esquemaId).optional(),
    condicion: esquemaId.optional(),
    requerido_si: esquemaId.optional(),
    secundario: esquemaSecundario.optional(),
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

// Un chip de unos atajos: la etiqueta (el año) es texto y el valor, el de la columna del nodo (puede faltar en la fila).
const esquemaChip = z.object({ etiqueta: z.string(), valor: z.number().nullable() })
const esquemaAtajos = z.object({
  tipo: z.literal('atajos'),
  nodo: esquemaId,
  chips: z.array(esquemaChip),
})

const esquemaVariante = z
  .object({
    tipo: z.literal('variante'),
    nodo: esquemaId,
    etiqueta: z.string().min(1),
    opciones: z
      .array(z.object({ clave: esquemaId, etiqueta: z.string(), titulo: z.string() }))
      .min(1),
    por_defecto: esquemaId.optional(),
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

const esquemaInterruptor = z
  .object({
    tipo: z.literal('interruptor'),
    nodo: esquemaId,
    etiqueta: z.string().min(1),
    efecto: z.enum(EFECTOS_DE_INTERRUPTOR),
    solo_en: z.array(esquemaId).optional(),
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

const esquemaSubtotal = z.object({
  tipo: z.literal('subtotal'),
  nodo: esquemaId,
  etiqueta: z.string().min(1),
  formato: z.enum(FORMATOS),
  tono: esquemaId.optional(),
})

export const esquemaItem = z.discriminatedUnion('tipo', [
  esquemaCelda,
  esquemaAtajos,
  esquemaVariante,
  esquemaInterruptor,
  esquemaSubtotal,
])

const esquemaSeccion = z.object({
  id: esquemaId,
  titulo: z.string().min(1).optional(),
  presentacion: z.enum(PRESENTACIONES),
  items: z.array(esquemaItem).min(1),
})

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const colores = z.object({ fondo: hex, borde: hex, tinta: hex })
const esquemaTono = z.object({ clave: esquemaId, claro: colores, oscuro: colores })

const esquemaDeNodoDeTarjeta = z.object({
  nodo: esquemaId,
  etiqueta: z.string().min(1),
  formato: z.enum(FORMATOS),
})
const esquemaOrigen = z.object({ id: z.guid(), nombre: z.string().min(1) })

export const esquemaLista = z.object({
  estado: z.literal('lista'),
  origen: esquemaOrigen,
  formula: z.object({ id: z.guid(), version: z.int().positive() }),
  abierta_en: z.string().min(1),
  // La hoja abierta que firma la base: lo único que `cotizacion_crear` y `cotizacion_evaluar` aceptan como `p_abierta`. Para la pantalla es opaca.
  abierta: z.string().min(1),
  vehiculo_obligatorio: z.boolean(),
  cabecera: z.object({
    modos: z.array(z.object({ clave: esquemaId, nombre: z.string().min(1) })),
    ver_total_bs: z.boolean(),
  }),
  secciones: z.array(esquemaSeccion),
  tarjeta_total: esquemaDeNodoDeTarjeta.extend({ secundarios: z.array(esquemaDeNodoDeTarjeta) }),
  tonos: z.array(esquemaTono),
})
const esquemaSinPublicar = z.object({
  estado: z.literal('sin_publicar'),
  origen: esquemaOrigen,
  puede_configurar: z.boolean(),
})
export const esquemaHoja = z.discriminatedUnion('estado', [esquemaLista, esquemaSinPublicar])
