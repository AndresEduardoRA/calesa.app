// Los nodos que la plantilla nombra o dibuja, espejo de `_plantilla_nodos()` (20261106185900_plantilla_validar.sql:83-132; 4.19-2). Cada clave de `etiquetas` y
// `leyendas` es un nodo de la fórmula con lugar en la tarjeta (un miembro de un grupo, el total o lo aparte de la tarjeta del total), y lo que dibuja es del
// nivel «todos» (no figurar en la visibilidad compilada cuenta como restringido). Todo lo que se busca por id va por `Map`/`Set`/`Object.hasOwn`.
import { rechazoDePlantilla, type RechazoDePlantilla } from './motivos-de-plantilla'
import { clavesEnOrdenC, compararComoC, esObjetoJsonb } from './json-de-la-base'
import type { Plantilla } from './forma-de-plantilla'

// Lo que se lee de la fórmula, el diseño y la visibilidad: sólo eso, y lo que la base pasa por `coalesce`, opcional (la `Definicion` y el `Diseno` de verdad
// les son asignables).
export type NodoParaPlantilla = {
  readonly id: string
  readonly grupo?: string | null
  readonly salida?: string | null
  // Lo que el editor dibuja (4.19-3b): la etiqueta del nodo y la del grupo, y el tono del grupo. `validarPlantilla()` no las mira.
  readonly etiqueta?: string | null
}
export type DefinicionParaPlantilla = {
  readonly nodos?: readonly NodoParaPlantilla[]
  readonly buckets?: Readonly<Record<string, string>>
  readonly grupos?: readonly {
    readonly id: string
    readonly bucket?: string | null
    readonly etiqueta?: string | null
    readonly tono?: string | null
    // Lo que la vista previa del editor dibuja del grupo (4.19-4): su plazo (la definición lo trae sin forma; el contexto reducido lo deja texto o nulo).
    readonly plazo?: unknown
  }[]
}
export type DisenoParaPlantilla = {
  readonly cabecera?: {
    readonly modos?: readonly {
      readonly buckets?: readonly { readonly bucket: string; readonly nodo: string }[]
    }[]
  }
  readonly tarjeta_total?: { readonly secundarios?: readonly string[] }
}
export type VisibilidadParaPlantilla = Readonly<Record<string, unknown>>

export type ContextoDeNodos = {
  readonly definicion: DefinicionParaPlantilla
  readonly diseno: DisenoParaPlantilla | null
  readonly visibilidad: VisibilidadParaPlantilla | null
}

type Candidato = {
  readonly id: string | undefined
  readonly d: number
  readonly orden: number
  readonly bucket: string
}

// Del nivel «todos»: la entrada es un objeto cuyo `ver` es el texto `todos`.
function esDeTodos(visibilidad: VisibilidadParaPlantilla, id: string): boolean {
  const entrada = Object.hasOwn(visibilidad, id) ? visibilidad[id] : undefined
  return esObjetoJsonb(entrada) && Object.hasOwn(entrada, 'ver') && entrada['ver'] === 'todos'
}

// Con la columna del tipo de cambio: el de cada bucket que usa un grupo (por omisión, `(1, 0, bucket)`, y en cada modo del diseño, `(2, modo·1000 + n.º, bucket)`)
// es del nivel «todos»; gana la clave menor entre los restringidos.
function tipoDeCambioRestringido(
  { definicion, diseno }: ContextoDeNodos,
  visibilidad: VisibilidadParaPlantilla,
): string | undefined {
  const usados = new Set(
    (definicion.grupos ?? []).flatMap((g) => (g.bucket == null ? [] : [g.bucket])),
  )
  const buckets = definicion.buckets ?? {}
  const porOmision: Candidato[] = [...usados].map((b) => ({
    id: Object.hasOwn(buckets, b) ? buckets[b] : undefined,
    d: 1,
    orden: 0,
    bucket: b,
  }))
  const deLosModos: Candidato[] = (diseno?.cabecera?.modos ?? []).flatMap((m, i) =>
    (m.buckets ?? []).flatMap((mb, j) =>
      usados.has(mb.bucket)
        ? [{ id: mb.nodo, d: 2, orden: (i + 1) * 1000 + j + 1, bucket: mb.bucket }]
        : [],
    ),
  )
  const [primero] = [...porOmision, ...deLosModos]
    .filter((c): c is Candidato & { id: string } => c.id != null && !esDeTodos(visibilidad, c.id))
    .sort((a, b) => a.d - b.d || a.orden - b.orden || compararComoC(a.bucket, b.bucket))
  return primero?.id
}

// Los nodos de la fórmula, el total, sus miembros, lo aparte y los que tienen lugar en la tarjeta.
// Exportada para el editor (4.19-3b): qué nodos tienen lugar en la tarjeta es la misma regla que la de la base.
export function lugaresDe({ definicion, diseno }: ContextoDeNodos) {
  const nodos = definicion.nodos ?? []
  const total = nodos.find((n) => n.salida === 'total')?.id
  const miembros = nodos.flatMap((n) => (n.grupo == null ? [] : [n.id]))
  const secundarios = diseno?.tarjeta_total?.secundarios ?? []
  const elTotal = total === undefined ? [] : [total]
  return {
    ids: new Set(nodos.map((n) => n.id)),
    lugar: new Set([...miembros, ...secundarios, ...elTotal]),
    // Lo que dibuja: los miembros en el orden de la fórmula, el total y lo aparte. La 4.ª rama de la base (lo nombrado, `:110`) no se espeja: tras
    // `nodo_sin_lugar` todo lo nombrado ya está en las tres primeras y nunca puede ser la primera.
    dibujados: [...miembros, ...elTotal, ...secundarios],
  }
}

export function revisarNodosDePlantilla(
  plantilla: Plantilla,
  contexto: ContextoDeNodos,
): RechazoDePlantilla | null {
  const visibilidad = contexto.visibilidad ?? {}
  const { ids, lugar, dibujados } = lugaresDe(contexto)

  // Las claves nombradas: las de etiquetas y después las de leyendas, cada una en orden C.
  const nombrados = [...clavesEnOrdenC(plantilla.etiquetas), ...clavesEnOrdenC(plantilla.leyendas)]
  const inexistente = nombrados.find((k) => !ids.has(k))
  if (inexistente !== undefined) return rechazoDePlantilla('nodo_inexistente', inexistente)
  const sinLugar = nombrados.find((k) => !lugar.has(k))
  if (sinLugar !== undefined) return rechazoDePlantilla('nodo_sin_lugar', sinLugar)
  const restringido = dibujados.find((id) => !esDeTodos(visibilidad, id))
  if (restringido !== undefined) return rechazoDePlantilla('nodo_restringido', restringido)

  if (!plantilla.columnas.tipo_cambio) return null
  const tipoDeCambio = tipoDeCambioRestringido(contexto, visibilidad)
  return tipoDeCambio === undefined
    ? null
    : rechazoDePlantilla('tipo_de_cambio_restringido', tipoDeCambio)
}
