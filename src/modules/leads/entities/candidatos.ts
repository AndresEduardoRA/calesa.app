// La búsqueda por candidatos (5a-fix-1b): cuándo el listado pide primero a la base los leads que coinciden y qué condiciones quedan para la
// página. Puro: sin base. Lo que se pide y lo que vuelve cruzan un límite y se validan con Zod.
//
// Por qué: bajo RLS `ilike` y `@>` no son _leakproof_, así que ningún índice los sostiene y la consulta recorre `leads` (207 ms la dueña con 212.000
// leads). `leads_candidatos()` (la base, `security definer`) saca de un índice los primeros K que coinciden, sólo de lo que quien llama ve, y la
// página se lee de `leads_vista_por_ids()` con el resto de las condiciones. `docs/RENDIMIENTO.md` › «Cierre 5a-fix-1b».
import { z } from 'zod'
import type { Cursor } from '@/shared/lib/paginacion'
import type { CondicionDeLead } from './filtros'

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
  atributos?: Record<string, string | boolean | string[]>[][]
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
// mira (5a-7: `leads_etiquetas` por `etiqueta_id`, en vez de calcular las de cada fila de la vista) y un campo público filtrado por su copia
// (`atributos_publicos`). Un privado, o uno con un cambio de privacidad a medias, va por `atributos`, que es lo que quien mira recibe recortado:
// la base no puede decidirlo desde los candidatos.
function esDeCandidatos(condicion: CondicionDeLead): boolean {
  return (
    (condicion.tipo === 'busqueda' && !condicion.soloNumero) ||
    condicion.tipo === 'etiquetas' ||
    (condicion.tipo === 'atributos_contienen' && condicion.columna === 'atributos_publicos')
  )
}

export function usaCandidatos(condiciones: readonly CondicionDeLead[]): boolean {
  return condiciones.some(esDeCandidatos)
}

type Atributos = Record<string, string | boolean | string[]>[][]

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
  atributos: Atributos,
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
  } else if (
    condicion.tipo === 'atributos_contienen' &&
    condicion.columna === 'atributos_publicos'
  ) {
    atributos.push([...condicion.alternativas])
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
  const atributos: Atributos = []
  for (const condicion of condiciones) {
    sumarAlPedido(filtros, atributos, condicion)
  }
  if (atributos.length > 0) {
    filtros.atributos = atributos
  }
  if (desde) {
    filtros.cursor = { creado_en: desde.creadoEn, id: desde.id }
  }
  return filtros
}

// Lo que la página vuelve a aplicar. Los candidatos ya son exactamente los que coinciden por nombre, por etiqueta (el lead que llega por su número
// también la tiene que tener: lo comprueba la base) y por un campo público: repetir esas condiciones sobre la lista de ids no cambia el resultado, y le cuesta caro al planificador, que las estima en casi cero filas y arma un
// `Nested Loop` que recorre `leads_favoritos` y `leads_tachados` enteras por cada candidato (88 ms con 300, contra 21). Todo lo demás sí se
// repite: «míos», tipo, origen, las marcas de quien mira (tachados y favoritos), un campo privado, un rango.
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
