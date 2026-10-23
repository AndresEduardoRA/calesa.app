// Los nodos de la fórmula (docs/COTIZADOR.md › «Forma»): un Zod por tipo, discriminado por `tipo` (y
// `calculo`, a su vez, por `op`). Cada objeto es estricto: una clave mal escrita es un error, no se
// ignora. Lo que se valida mirando un solo valor vive acá; lo que cruza nodos, en `validar.ts`.
import { z } from 'zod'

// El id de un nodo, un grupo, un bucket, una opción o un tono: el patrón de `validar_formula()`.
export const esquemaId = z.string().regex(/^[a-z][a-z0-9_]{0,40}$/)
// Un campo del vehículo (`anio`, `atributos.cilindrada`): un `match` que no nombra un nodo es esto.
const esquemaCampo = z
  .string()
  .max(80)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/)

export const FORMATOS = ['usd', 'pct', 'raw', 'moneda'] as const
export const SALIDAS = ['total', 'base_imponible', 'aparte'] as const
const COLORES = ['amarillo', 'verde', 'naranja'] as const

export type Formato = (typeof FORMATOS)[number]

const texto = (max: number) => z.string().min(1).max(max)

// Lo que todo nodo puede llevar. `seccion` y `color` son de la Fase 0: el diseño (4.08) los reemplaza.
const base = {
  id: esquemaId,
  etiqueta: texto(80),
  formato: z.enum(FORMATOS).optional(),
  descripcion: z.string().max(300).optional(),
  seccion: texto(60).optional(),
  color: z.enum(COLORES).optional(),
  salida: z.enum(SALIDAS).optional(),
  // Sólo en una fórmula sin `grupos` (la forma de la Fase 0). `ninguno` = sin bucket.
  bucket: esquemaId.optional(),
  grupo: esquemaId.optional(),
}
// Lo que un nodo de valor suma: la variante y el interruptor que lo habilita.
const deValor = {
  ...base,
  solo_en: z.array(esquemaId).min(1).optional(),
  condicion: esquemaId.optional(),
}
const sobrescribible = { sobrescribible: z.boolean().optional() }

const esquemaInput = z.strictObject({
  ...deValor,
  tipo: z.literal('input'),
  sugerido_de: esquemaId.optional(),
  requerido_si: esquemaId.optional(),
})
// `tablas` es la clave de `params` donde van las filas congeladas (D5): ninguna constante se llama así.
const esquemaConstante = z.strictObject({
  ...deValor,
  id: esquemaId.refine((id) => id !== 'tablas', {
    error: '«tablas» es una clave reservada de params',
  }),
  tipo: z.literal('constante'),
})
// Un tipo de cambio y la variante no dependen de otra variante ni de un interruptor.
const esquemaTipoCambio = z.strictObject({
  ...base,
  tipo: z.literal('tipo_cambio'),
  clave: esquemaId,
})
const esquemaCampoVehiculo = z.strictObject({
  ...base,
  solo_en: deValor.solo_en,
  tipo: z.literal('campo_vehiculo'),
  campo: esquemaCampo,
})
const esquemaBandera = z.strictObject({
  ...base,
  solo_en: deValor.solo_en,
  tipo: z.literal('bandera'),
})
const esquemaOpcionDeVariante = z.strictObject({
  clave: esquemaId,
  etiqueta: texto(60),
  titulo: texto(120),
})
const esquemaOpcion = z.strictObject({
  ...base,
  tipo: z.literal('opcion'),
  opciones: z.array(esquemaOpcionDeVariante).min(2),
  por_defecto: esquemaId.optional(),
})
const esquemaTabla = z.strictObject({
  ...deValor,
  ...sobrescribible,
  tipo: z.literal('tabla'),
  tabla: esquemaId,
  // columna de la tabla → un nodo anterior con ese id o, si no hay, un campo del vehículo.
  match: z.record(esquemaId, esquemaCampo),
  columna: esquemaId,
})
const esquemaTramo = z.strictObject({
  ...deValor,
  ...sobrescribible,
  tipo: z.literal('tramo'),
  tabla: esquemaId,
  sobre: esquemaId,
  columna: esquemaId,
})

// `calculo`, con la aridad de cada operación cerrada.
const deCalculo = { ...deValor, ...sobrescribible, tipo: z.literal('calculo') }
const uno = z.tuple([esquemaId])
const esquemaCalculo = z.discriminatedUnion('op', [
  z.strictObject({ ...deCalculo, op: z.literal('suma'), de: z.array(esquemaId).min(1) }),
  z.strictObject({
    ...deCalculo,
    op: z.literal('porcentaje_de'),
    de: z.array(esquemaId).min(1),
    pct: esquemaId,
  }),
  z.strictObject({ ...deCalculo, op: z.literal('multiplicar'), de: z.array(esquemaId).min(2) }),
  z.strictObject({ ...deCalculo, op: z.literal('restar'), de: z.array(esquemaId).min(2) }),
  z.strictObject({ ...deCalculo, op: z.literal('dividir'), de: z.tuple([esquemaId, esquemaId]) }),
  z.strictObject({ ...deCalculo, op: z.literal('si'), de: uno, condicion: esquemaId }),
  z.strictObject({
    ...deCalculo,
    op: z.literal('depreciar'),
    de: uno,
    tabla: esquemaId,
    sobre: esquemaId,
    columna: esquemaId,
  }),
  z.strictObject({ ...deCalculo, op: z.literal('redondear'), de: uno, n: z.int().min(0).max(6) }),
])

export const esquemaNodo = z.discriminatedUnion('tipo', [
  esquemaInput,
  esquemaConstante,
  esquemaTipoCambio,
  esquemaCampoVehiculo,
  esquemaBandera,
  esquemaOpcion,
  esquemaTabla,
  esquemaTramo,
  esquemaCalculo,
])

export type Nodo = z.infer<typeof esquemaNodo>
export type TipoDeNodo = Nodo['tipo']
export type NodoCalculo = Extract<Nodo, { tipo: 'calculo' }>
export type NodoOpcion = Extract<Nodo, { tipo: 'opcion' }>

// Cómo un nodo nombra a otro. `match` puede nombrar un nodo o un campo del vehículo.
export type PapelDeReferencia =
  'de' | 'pct' | 'sobre' | 'condicion' | 'requerido_si' | 'sugerido_de' | 'match'
export type Referencia = { id: string; papel: PapelDeReferencia }

const refs = (papel: PapelDeReferencia, ids: readonly (string | undefined)[]): Referencia[] =>
  ids.flatMap((id) => (id === undefined ? [] : [{ id, papel }]))

function referenciasDeCalculo(n: NodoCalculo): Referencia[] {
  const comunes = refs('condicion', [n.condicion])
  switch (n.op) {
    case 'porcentaje_de':
      return [...refs('de', n.de), ...refs('pct', [n.pct]), ...comunes]
    case 'depreciar':
      return [...refs('de', n.de), ...refs('sobre', [n.sobre]), ...comunes]
    case 'suma':
    case 'multiplicar':
    case 'restar':
    case 'dividir':
    case 'si':
    case 'redondear':
      return [...refs('de', n.de), ...comunes]
    default: {
      const _: never = n
      return _
    }
  }
}

// Los nodos que este nodo lee, en el orden en que aparecen. Un nodo nuevo = un caso acá.
export function referenciasDe(n: Nodo): Referencia[] {
  switch (n.tipo) {
    case 'input':
      return [
        ...refs('sugerido_de', [n.sugerido_de]),
        ...refs('requerido_si', [n.requerido_si]),
        ...refs('condicion', [n.condicion]),
      ]
    case 'constante':
      return refs('condicion', [n.condicion])
    case 'tipo_cambio':
    case 'campo_vehiculo':
    case 'bandera':
    case 'opcion':
      return []
    case 'tabla':
      return [...refs('match', Object.values(n.match)), ...refs('condicion', [n.condicion])]
    case 'tramo':
      return [...refs('sobre', [n.sobre]), ...refs('condicion', [n.condicion])]
    case 'calculo':
      return referenciasDeCalculo(n)
    default: {
      const _: never = n
      return _
    }
  }
}

// `formato` es opcional y vale `usd`, como el `coalesce` de la base. El Zod no pone el default:
// lo que se guarda no cambia al validarlo.
export const formatoDe = (n: Pick<Nodo, 'formato'>): Formato => n.formato ?? 'usd'
export const esMonto = (n: Pick<Nodo, 'formato'>) =>
  formatoDe(n) === 'usd' || formatoDe(n) === 'moneda'

// Si el tipo de nodo da un monto, sea cual sea su formato: un tipo de cambio, un campo del vehículo, una
// bandera o la variante no lo dan, aunque digan `usd`. Sólo lo que da un monto puede ser miembro de un grupo.
export function daMonto(n: Nodo): boolean {
  switch (n.tipo) {
    case 'input':
    case 'constante':
    case 'tabla':
    case 'tramo':
    case 'calculo':
      return true
    case 'tipo_cambio':
    case 'campo_vehiculo':
    case 'bandera':
    case 'opcion':
      return false
    default: {
      const _: never = n
      return _
    }
  }
}
// `ninguno` (o nada) = sin bucket.
export const bucketDe = (n: Pick<Nodo, 'bucket'>) =>
  n.bucket === undefined || n.bucket === 'ninguno' ? undefined : n.bucket
// Lo que un nodo condiciona a su variante (los tipos que lo admiten).
export const soloEnDe = (n: Nodo): readonly string[] | undefined =>
  n.tipo === 'tipo_cambio' || n.tipo === 'opcion' ? undefined : n.solo_en
export const sobrescribibleDe = (n: Nodo) =>
  (n.tipo === 'tabla' || n.tipo === 'tramo' || n.tipo === 'calculo') && n.sobrescribible === true
export const condicionDe = (n: Nodo): string | undefined =>
  n.tipo === 'input' ||
  n.tipo === 'constante' ||
  n.tipo === 'tabla' ||
  n.tipo === 'tramo' ||
  n.tipo === 'calculo'
    ? n.condicion
    : undefined
