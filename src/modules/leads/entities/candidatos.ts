// La búsqueda por candidatos (5a-fix-1b): cuándo el listado pide primero a la base los leads que coinciden y qué condiciones quedan para la
// página. Puro: sin base. Lo que se pide y lo que vuelve cruzan un límite y se validan con Zod.
//
// Por qué: bajo RLS `ilike` y `@>` no son _leakproof_, así que ningún índice los sostiene y la consulta recorre `leads` (207 ms la dueña con 212.000
// leads). `leads_candidatos()` (la base, `security definer`) saca de un índice los primeros K que coinciden, sólo de lo que quien llama ve, y la
// página se lee de `leads_vista_por_ids()` con el resto de las condiciones. `docs/RENDIMIENTO.md` › «Cierre 5a-fix-1b».
import { z } from 'zod'
import type { Cursor } from '@/shared/lib/paginacion'
import type { CondicionDeLead } from './filtros'

type Atributos = Record<string, string | boolean | string[]>[][]

// La forma que la base lee de `p_filtros` (`leads_candidatos`). Todo opcional y todo sólo acota: la página vuelve a aplicar lo que no se empujó.
export type FiltrosDeCandidatos = {
  // El nombre que se busca, tal como lo escribió la persona (sin el «#»): la base arma el patrón con `_lead_busqueda_patron()`.
  texto?: string
  // «Míos»: sólo la cartera de quien mira.
  mios?: boolean
  tipos?: string[]
  origenes?: string[]
  // Las etiquetas de quien mira (cualquiera de ellas): la base descarta las que no son suyas, y si no queda ninguna, no hay candidatos (5a-7).
  etiquetas?: string[]
  // Un Y de Os de `@>` sobre `atributos_publicos`.
  atributos?: Atributos
  // Lo mismo sobre `atributos` sin recortar (un campo privado, o a medias de cambiar de privacidad, 5a-10). La base lo lee **sólo de la cartera de quien llama**: pedirlo
  // vuelve «míos» la ventana, y nadie encuentra por un privado lo que no es suyo.
  privados?: Atributos
  cursor?: { creado_en: string; id: string }
  sentido: 'siguiente' | 'anterior'
  // Los leads con el número buscado (ya resueltos, sólo los que quien mira ve): cuentan aunque el nombre no coincida.
  extra?: string[]
}

// Qué trae `leads_candidatos()`: los primeros candidatos en el orden del listado después del cursor, si ahí no hay más, y hasta dónde llegó.
const esquemaDeCandidatos = z.object({
  ids: z.array(z.guid()),
  completa: z.boolean(),
  hasta: z.object({ creado_en: z.string(), id: z.guid() }).nullable(),
})
export type Candidatos = z.infer<typeof esquemaDeCandidatos>

// Una respuesta con otra forma no se usa: quien llama vuelve al camino de siempre (lee la consulta completa).
export function candidatosDesde(data: unknown): Candidatos | null {
  const leidos = esquemaDeCandidatos.safeParse(data)
  return leidos.success ? leidos.data : null
}

// Las condiciones que un candidato puede cumplir antes de leer la página: la búsqueda por nombre (que no sea sólo por número), las etiquetas de quien
// mira (5a-7: `leads_etiquetas` por `etiqueta_id`, en vez de calcular las de cada fila de la vista), un campo público filtrado por su copia
// (`atributos_publicos`) y, desde 5a-10, un campo privado o a medias de cambiar de privacidad (`atributos`): la vista lo calculaba con `atributos_lead()` en cada
// lead de la cartera (63 µs, 5.320 ms la dueña con 212.000 leads), y la base lo lee sin recortar sólo de la cartera de quien llama, que es lo que esa función le daría.
// Un texto o un rango sobre un campo privado (`atributo_texto`, `atributo_rango_*`) sigue en la página: 5a-34.
function esDeCandidatos(condicion: CondicionDeLead): boolean {
  return (
    (condicion.tipo === 'busqueda' && !condicion.soloNumero) ||
    condicion.tipo === 'etiquetas' ||
    condicion.tipo === 'atributos_contienen'
  )
}

export function usaCandidatos(condiciones: readonly CondicionDeLead[]): boolean {
  return condiciones.some(esDeCandidatos)
}

function sumarBusqueda(
  filtros: FiltrosDeCandidatos,
  condicion: Extract<CondicionDeLead, { tipo: 'busqueda' }>,
): void {
  if (condicion.soloNumero) {
    return
  }
  filtros.texto = condicion.texto
  if (condicion.idsDelNumero.length > 0) {
    filtros.extra = [...condicion.idsDelNumero]
  }
}

// Lo que una condición le suma a lo que se le pide a la base (nada, si la página es quien la decide: las marcas, un campo privado, un rango).
function sumarAlPedido(
  filtros: FiltrosDeCandidatos,
  { atributos, privados }: { atributos: Atributos; privados: Atributos },
  condicion: CondicionDeLead,
): void {
  if (condicion.tipo === 'busqueda') {
    sumarBusqueda(filtros, condicion)
  } else if (condicion.tipo === 'etiquetas') {
    filtros.etiquetas = [...condicion.ids]
  } else if (condicion.tipo === 'en_cartera') {
    filtros.mios = true
  } else if (condicion.tipo === 'columna_en') {
    filtros[condicion.columna === 'tipo_lead_id' ? 'tipos' : 'origenes'] = [...condicion.valores]
  } else if (condicion.tipo === 'atributos_contienen') {
    // Un campo público por su copia (`atributos_publicos`); uno privado, por `atributos`, que la base lee sólo de la cartera de quien llama.
    const grupos = condicion.columna === 'atributos_publicos' ? atributos : privados
    grupos.push([...condicion.alternativas])
  }
}

// Lo que se le pide a la base para esta ventana. Una ventana son los primeros K después de `desde` (el cursor de la persona, o hasta donde
// llegó la ventana anterior).
export function filtrosDeCandidatos(
  condiciones: readonly CondicionDeLead[],
  desde: Cursor | null,
  sentido: Cursor['sentido'],
): FiltrosDeCandidatos {
  const filtros: FiltrosDeCandidatos = { sentido }
  const grupos = { atributos: [] as Atributos, privados: [] as Atributos }
  for (const condicion of condiciones) {
    sumarAlPedido(filtros, grupos, condicion)
  }
  if (grupos.atributos.length > 0) {
    filtros.atributos = grupos.atributos
  }
  if (grupos.privados.length > 0) {
    filtros.privados = grupos.privados
  }
  if (desde) {
    filtros.cursor = { creado_en: desde.creadoEn, id: desde.id }
  }
  return filtros
}

// Lo que la página vuelve a aplicar. Los candidatos ya son exactamente los que coinciden por nombre, por etiqueta y por un campo, público o privado (el lead que llega por su
// número también las cumple: lo comprueba la base): repetir esas condiciones sobre la lista de ids no cambia el resultado, y le cuesta caro al planificador, que las estima en casi cero filas y arma un
// `Nested Loop` que recorre `leads_favoritos` y `leads_tachados` enteras por cada candidato (88 ms con 300, contra 21). Todo lo demás sí se
// repite: «míos», tipo, origen, las marcas de quien mira (tachados y favoritos), un texto o un rango sobre un campo privado.
export function condicionesDeLaPagina(
  condiciones: readonly CondicionDeLead[],
): readonly CondicionDeLead[] {
  return condiciones.filter((condicion) => !esDeCandidatos(condicion))
}

// Cuántas ventanas se piden, a lo sumo, antes de volver al camino de siempre: las que hacen falta para llenar la página si cada ventana trae
// la mitad de lo que se pide, más dos. Un filtro de quien mira que deja pasar pocos (favoritos y un nombre común) no se queda pidiendo
// ventanas: cuesta, como mucho, lo que costaba.
const CANDIDATOS_POR_VENTANA_ESPERADOS = 100
export function ventanasHasta(tamano: number): number {
  return Math.ceil((tamano + 1) / CANDIDATOS_POR_VENTANA_ESPERADOS) + 2
}
