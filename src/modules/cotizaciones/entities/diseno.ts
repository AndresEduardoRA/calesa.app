// El diseño de la hoja (D7; docs/COTIZADOR.md › «El diseño de la hoja»): cómo se ve y se maneja la hoja de un origen. Es declarativo:
// objetos estrictos, un enum para cada decisión visual y un id para cada referencia; nada de CSS, clases, HTML ni hex. Ninguna colección
// es un `z.record` (la clave de cada modo y de cada bucket va adentro): así una clave `__proto__` sólo puede ser una clave desconocida de
// un objeto estricto, y la rechazan igual Zod y `validar_diseno()`. Lo que cruza el diseño con la fórmula vive en `validar-diseno*.ts`.
import { z } from 'zod'
import { esquemaId } from './nodos'

export const ANCHOS = ['completo', 'mitad', 'tercio'] as const
export const PRESENTACIONES = ['principal', 'avanzado'] as const
export const SECUNDARIOS = ['porcentaje', 'monto'] as const
export const EFECTOS_DE_INTERRUPTOR = ['habilita', 'muestra'] as const
// Cuántas filas de una tabla se ofrecen como chips (los años del factor de depreciación).
export const MAXIMO_DE_ATAJOS = 12
// El nivel que todos tienen: no se crea, no se retira y no genera permisos (D7).
export const NIVEL_TODOS = 'todos'

// Se cuenta en caracteres, como `char_length` de `validar_diseno()` (y como Zod 4: un emoji es uno).
const texto = (max: number) => z.string().min(1).max(max)

// Un modo de tipo de cambio: la misma forma que `buckets` y `total_en` de la fórmula, con la clave y el nombre adentro.
const esquemaModo = z.strictObject({
  clave: esquemaId,
  nombre: texto(40),
  buckets: z.array(z.strictObject({ bucket: esquemaId, nodo: esquemaId })).min(1),
  total_en: esquemaId,
})
const esquemaCabecera = z.strictObject({ modos: z.array(esquemaModo), ver_total_bs: z.boolean() })

// Una ayuda es la tabla de referencia que se abre o un texto, no las dos.
const esquemaAyuda = z.union([
  z.strictObject({ tabla: esquemaId }),
  z.strictObject({ texto: texto(300) }),
])

const esquemaCelda = z.strictObject({
  tipo: z.literal('celda'),
  nodo: esquemaId,
  ancho: z.enum(ANCHOS),
  secundario: z.enum(SECUNDARIOS).optional(),
  ayuda: esquemaAyuda.optional(),
  nivel_ver: esquemaId.optional(),
  nivel_editar: esquemaId.optional(),
})
const esquemaAtajos = z.strictObject({
  tipo: z.literal('atajos'),
  nodo: esquemaId,
  columna: esquemaId,
  filas: z.int().min(1).max(MAXIMO_DE_ATAJOS),
})
const esquemaVariante = z.strictObject({ tipo: z.literal('variante'), nodo: esquemaId })
const esquemaInterruptor = z.strictObject({
  tipo: z.literal('interruptor'),
  nodo: esquemaId,
  efecto: z.enum(EFECTOS_DE_INTERRUPTOR),
})
const esquemaSubtotal = z.strictObject({ tipo: z.literal('subtotal'), nodo: esquemaId })

const esquemaItem = z.discriminatedUnion('tipo', [
  esquemaCelda,
  esquemaAtajos,
  esquemaVariante,
  esquemaInterruptor,
  esquemaSubtotal,
])

// El orden de las secciones es el del DOM, de lectura y del `Tab`.
const esquemaSeccion = z.strictObject({
  id: esquemaId,
  titulo: texto(80).optional(),
  presentacion: z.enum(PRESENTACIONES),
  nivel_ver: esquemaId.optional(),
  nivel_editar: esquemaId.optional(),
  items: z.array(esquemaItem).min(1),
})

// La tarjeta no se ubica en el diseño (es el resumen fijo): sólo dice qué muestra.
const esquemaTarjeta = z.strictObject({ nodo: esquemaId, secundarios: z.array(esquemaId) })

// El orden de las claves es el que Zod recorre para dar su primer error: cabecera, secciones, tarjeta (`validar_diseno()` lo copia).
export const esquemaDiseno = z.strictObject({
  cabecera: esquemaCabecera,
  secciones: z.array(esquemaSeccion).min(1),
  tarjeta_total: esquemaTarjeta,
})

export type Diseno = z.infer<typeof esquemaDiseno>
export type ModoDeTipoDeCambio = Diseno['cabecera']['modos'][number]
export type SeccionDeDiseno = Diseno['secciones'][number]
export type ItemDeDiseno = SeccionDeDiseno['items'][number]
export type CeldaDeDiseno = Extract<ItemDeDiseno, { tipo: 'celda' }>
