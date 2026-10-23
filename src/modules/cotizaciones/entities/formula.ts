// La fórmula entera: `definicion` (los nodos, los buckets, el tipo de cambio del total y los grupos) y
// `params` (el valor de cada constante y las filas congeladas de sus tablas, D5). docs/COTIZADOR.md › «Forma».
import { z } from 'zod'
import { esquemaId, esquemaNodo } from './nodos'

// Un grupo de la hoja: un plazo de pago, el tono del catálogo de la empresa y el bucket que le da su
// tipo de cambio. No es un nodo: su subtotal es la suma de sus miembros (`nodo.grupo`).
const esquemaGrupo = z.strictObject({
  id: esquemaId,
  etiqueta: z.string().min(1).max(60),
  plazo: z.string().min(1).max(40).optional(),
  tono: esquemaId,
  bucket: esquemaId,
})

// `ninguno` quiere decir «sin bucket»: no puede ser el nombre de uno.
const esquemaNombreDeBucket = esquemaId.refine((b) => b !== 'ninguno', {
  error: '«ninguno» no es un bucket',
})

// bucket → id de un nodo `tipo_cambio`. Es también la forma de un modo (abajo).
const esquemaBuckets = z.record(esquemaNombreDeBucket, esquemaId)

export const esquemaDefinicion = z.strictObject({
  nodos: z.array(esquemaNodo),
  buckets: esquemaBuckets.optional(),
  // El nodo `tipo_cambio` que divide el total en Bs: el «TOTAL DÓLARES» del Excel. Obligatorio con grupos.
  total_en: esquemaId.optional(),
  grupos: z.array(esquemaGrupo).optional(),
})

export const esquemaFila = z.record(esquemaId, z.union([z.number(), z.string().max(200), z.null()]))

// Lo guardado es plano (`{flete: 900, …, tablas?: {…}}`, como el seed); el código lo recibe partido.
export const esquemaParams = z
  .object({ tablas: z.record(esquemaId, z.array(esquemaFila)).optional() })
  .catchall(z.number())
  .transform(({ tablas, ...constantes }) => ({ constantes, tablas: tablas ?? {} }))

export const esquemaFormula = z.strictObject({
  definicion: esquemaDefinicion,
  params: esquemaParams,
})

// Un modo de tipo de cambio, como lo recibe el motor: el mismo mapa que `buckets` y `total_en`, completo.
// Los declara el diseño de la hoja (4.08); sin modo, el motor usa los de la fórmula.
export const esquemaModoDeCambio = z.strictObject({ buckets: esquemaBuckets, total_en: esquemaId })

export type Definicion = z.infer<typeof esquemaDefinicion>
export type Grupo = NonNullable<Definicion['grupos']>[number]
export type Params = z.output<typeof esquemaParams>
export type FilaDeTabla = z.infer<typeof esquemaFila>
export type Formula = z.output<typeof esquemaFormula>
export type ModoDeCambio = z.infer<typeof esquemaModoDeCambio>
