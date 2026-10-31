// La búsqueda por candidatos (5a-fix-1b): cuándo el listado pide primero a la base los leads que coinciden y qué condiciones quedan para la
// página. Puro: sin base. Lo que se pide y lo que vuelve cruzan un límite y se validan con Zod.
//
// Por qué: bajo RLS `ilike` y `@>` no son _leakproof_, así que ningún índice los sostiene y la consulta recorre `leads` (207 ms la dueña con 212.000
// leads). `leads_candidatos()` (la base, `security definer`) saca de un índice los primeros K que coinciden, sólo de lo que quien llama ve, y la
// página se lee de `leads_vista_por_ids()` con el resto de las condiciones. `docs/RENDIMIENTO.md` › «Cierre 5a-fix-1b».
import { z } from 'zod'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { CondicionDeLead } from './filtros'
import type { FilaDeLead } from './listado'

type Atributos = Record<string, string | boolean | string[]>[][]

// Un texto o un rango sobre un campo (4.03, 5a-9 y 5a-34), tal como lo lee `leads_candidatos()`: el texto es `ilike '%…%'` sobre `->> clave`, el rango de número compara el
// jsonb con el número (como PostgREST con `->`) y el de texto o fecha compara `->> clave` (`antes_de` es exclusivo). Sin un límite, ese lado no filtra.
export type ComparacionDeCampo =
  | { tipo: 'texto'; clave: string; texto: string }
  | { tipo: 'rango_numero'; clave: string; min?: number; max?: number }
  | { tipo: 'rango_texto'; clave: string; desde?: string; antes_de?: string }

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
  // El texto y el rango de un campo **público** (sobre la copia de lo público) y de uno **privado** (sobre `atributos`, sólo de la cartera de quien llama: pedirlo vuelve «míos»
  // la ventana, como `privados`). Un texto de menos de 3 letras o dígitos seguidos no filtra (espejo de `cumpleElMinimo()`); lo mal formado se ignora.
  comparaciones?: ComparacionDeCampo[]
  comparaciones_privadas?: ComparacionDeCampo[]
  // Sólo los leads que quien llama tachó (4.03, 5a-34): la marca es suya, nunca del pedido. Sin esto el conteo de los tachados ocultos recorría la cartera hasta juntarlos.
  tachados?: boolean
  cursor?: { creado_en: string; id: string }
  sentido: 'siguiente' | 'anterior'
  // Los leads con el número buscado (ya resueltos, sólo los que quien mira ve): cuentan aunque el nombre no coincida.
  extra?: string[]
}

// Hasta dónde llegó una búsqueda que se quedó en el tope (4.03, 5a-9): el texto y el rango de un campo público no tienen índice, así que se recorren como mucho 10.000 leads
// (la ventana de candidatos) y se dice. `seguir` es el cursor que sigue desde el último que miró; `hastaEn`, su fecha de alta.
export type RecorridoAcotado = { recorridos: number; hastaEn: string; seguir: string }

// Una página de leads con, si la búsqueda se quedó en el tope, hasta dónde llegó.
export type PaginaDeLeads = Pagina<FilaDeLead> & { recorrido: RecorridoAcotado | null }

// Qué trae `leads_candidatos()`: los primeros candidatos en el orden del listado después del cursor, si ahí no hay más, y hasta dónde llegó.
const esquemaDeCandidatos = z.object({
  ids: z.array(z.guid()),
  completa: z.boolean(),
  hasta: z.object({ creado_en: z.string(), id: z.guid() }).nullable(),
  // El tope de un campo público (4.03, 5a-9): la ventana miró `recorridos` leads sin juntar los candidatos y se quedó ahí; `hasta` es el último que miró. No es «no hay más»:
  // la pantalla lo dice y ofrece seguir desde ahí.
  acotada: z.boolean().optional(),
  recorridos: z.number().int().optional(),
})
export type Candidatos = z.infer<typeof esquemaDeCandidatos>

// Una respuesta con otra forma no se usa: quien llama vuelve al camino de siempre (lee la consulta completa).
export function candidatosDesde(data: unknown): Candidatos | null {
  const leidos = esquemaDeCandidatos.safeParse(data)
  return leidos.success ? leidos.data : null
}

type Comparacion = Extract<
  CondicionDeLead,
  { tipo: 'atributo_texto' | 'atributo_rango_numero' | 'atributo_rango_texto' }
>

function esComparacion(condicion: CondicionDeLead): condicion is Comparacion {
  return (
    condicion.tipo === 'atributo_texto' ||
    condicion.tipo === 'atributo_rango_numero' ||
    condicion.tipo === 'atributo_rango_texto'
  )
}

// Las condiciones que un candidato puede cumplir antes de leer la página: la búsqueda por nombre (que no sea sólo por número), las etiquetas de quien
// mira (5a-7: `leads_etiquetas` por `etiqueta_id`, en vez de calcular las de cada fila de la vista), un campo público filtrado por su copia
// (`atributos_publicos`) y, desde 5a-10, un campo privado o a medias de cambiar de privacidad (`atributos`): la vista lo calculaba con `atributos_lead()` en cada
// lead de la cartera (63 µs, 5.320 ms la dueña con 212.000 leads), y la base lo lee sin recortar sólo de la cartera de quien llama, que es lo que esa función le daría.
// Desde 4.03 también el texto y el rango de un campo (5a-9 y 5a-34): el privado siempre (su costo lo acota la cartera) y el público **con el tope** (`conTope`): quien lo lee
// de la vista —una exportación, que quiere todo— lo deja en la página.
function esDeCandidatos(condicion: CondicionDeLead, conTope: boolean): boolean {
  return (
    (condicion.tipo === 'busqueda' && !condicion.soloNumero) ||
    condicion.tipo === 'etiquetas' ||
    condicion.tipo === 'atributos_contienen' ||
    (esComparacion(condicion) && (condicion.columna === 'atributos' || conTope))
  )
}

// `conTope`: se lee con el tope del recorrido de un campo público (el listado). La exportación lo pide completo y los campos públicos los lee de la vista.
export function usaCandidatos(condiciones: readonly CondicionDeLead[], conTope = true): boolean {
  return condiciones.some((condicion) => esDeCandidatos(condicion, conTope))
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

function comparacionDe(condicion: Comparacion): ComparacionDeCampo {
  if (condicion.tipo === 'atributo_texto') {
    return { tipo: 'texto', clave: condicion.clave, texto: condicion.texto }
  }
  if (condicion.tipo === 'atributo_rango_numero') {
    return {
      tipo: 'rango_numero',
      clave: condicion.clave,
      ...(condicion.min === null ? {} : { min: condicion.min }),
      ...(condicion.max === null ? {} : { max: condicion.max }),
    }
  }
  return {
    tipo: 'rango_texto',
    clave: condicion.clave,
    ...(condicion.desde === null ? {} : { desde: condicion.desde }),
    ...(condicion.antesDe === null ? {} : { antes_de: condicion.antesDe }),
  }
}

type Grupos = {
  atributos: Atributos
  privados: Atributos
  comparaciones: ComparacionDeCampo[]
  comparacionesPrivadas: ComparacionDeCampo[]
}

// Lo que una condición le suma a lo que se le pide a la base (nada, si la página es quien la decide: las marcas, o un campo público con una exportación).
function sumarAlPedido(
  filtros: FiltrosDeCandidatos,
  grupos: Grupos,
  condicion: CondicionDeLead,
  conTope: boolean,
): void {
  if (condicion.tipo === 'busqueda') {
    sumarBusqueda(filtros, condicion)
  } else if (condicion.tipo === 'etiquetas') {
    filtros.etiquetas = [...condicion.ids]
  } else if (condicion.tipo === 'en_cartera') {
    filtros.mios = true
  } else if (condicion.tipo === 'columna_en') {
    filtros[condicion.columna === 'tipo_lead_id' ? 'tipos' : 'origenes'] = [...condicion.valores]
  } else {
    sumarDeCampoOMarca(filtros, grupos, condicion, conTope)
  }
}

// Lo de un campo (opciones, texto o rango, público o privado) y la marca de los tachados.
function sumarDeCampoOMarca(
  filtros: FiltrosDeCandidatos,
  grupos: Grupos,
  condicion: CondicionDeLead,
  conTope: boolean,
): void {
  if (condicion.tipo === 'atributos_contienen') {
    // Un campo público por su copia (`atributos_publicos`); uno privado, por `atributos`, que la base lee sólo de la cartera de quien llama.
    const lista = condicion.columna === 'atributos_publicos' ? grupos.atributos : grupos.privados
    lista.push([...condicion.alternativas])
  } else if (condicion.tipo === 'tachado' && condicion.valor) {
    // Sólo «los que tachó»: «los que no» no acota (casi todos) y la página lo decide. No pide candidatos por sí sola (`usaCandidatos`): acelera los que ya los piden.
    filtros.tachados = true
  } else if (esComparacion(condicion) && esDeCandidatos(condicion, conTope)) {
    const lista =
      condicion.columna === 'atributos' ? grupos.comparacionesPrivadas : grupos.comparaciones
    lista.push(comparacionDe(condicion))
  }
}

// El conteo de los tachados ocultos y el de la exportación (`contarLeadsHasta`) leen por los candidatos cuando hay un campo privado: la vista calculaba `atributos_lead()` en cada
// lead de la cartera (la dueña con 212.000 leads: 280 ms los ocultos, 5.409 el primer pedido de la exportación). Sin un privado la vista ya es barata y lo público se queda ahí.
export function cuentaPorCandidatos(condiciones: readonly CondicionDeLead[]): boolean {
  return condiciones.some(
    (condicion) =>
      (condicion.tipo === 'atributos_contienen' || esComparacion(condicion)) &&
      condicion.columna === 'atributos',
  )
}

// Lo que se le pide a la base para esta ventana. Una ventana son los primeros K después de `desde` (el cursor de la persona, o hasta donde
// llegó la ventana anterior).
export function filtrosDeCandidatos(
  condiciones: readonly CondicionDeLead[],
  desde: Cursor | null,
  sentido: Cursor['sentido'],
  conTope = true,
): FiltrosDeCandidatos {
  const filtros: FiltrosDeCandidatos = { sentido }
  const grupos: Grupos = {
    atributos: [],
    privados: [],
    comparaciones: [],
    comparacionesPrivadas: [],
  }
  for (const condicion of condiciones) {
    sumarAlPedido(filtros, grupos, condicion, conTope)
  }
  if (grupos.atributos.length > 0) {
    filtros.atributos = grupos.atributos
  }
  if (grupos.privados.length > 0) {
    filtros.privados = grupos.privados
  }
  if (grupos.comparaciones.length > 0) {
    filtros.comparaciones = grupos.comparaciones
  }
  if (grupos.comparacionesPrivadas.length > 0) {
    filtros.comparaciones_privadas = grupos.comparacionesPrivadas
  }
  if (desde) {
    filtros.cursor = { creado_en: desde.instante, id: desde.id }
  }
  return filtros
}

// Lo que la página vuelve a aplicar. Los candidatos ya son exactamente los que coinciden por nombre, por etiqueta y por un campo —público o privado, en opciones, texto o rango— (el
// lead que llega por su número también las cumple: lo comprueba la base): repetir esas condiciones sobre la lista de ids no cambia el resultado, y le cuesta caro al planificador, que las estima en casi cero filas y arma un
// `Nested Loop` que recorre `leads_favoritos` y `leads_tachados` enteras por cada candidato (88 ms con 300, contra 21). Todo lo demás sí se
// repite: «míos», tipo, origen y las marcas de quien mira (tachados y favoritos); y, si se lee sin el tope, el texto y el rango de un campo público.
export function condicionesDeLaPagina(
  condiciones: readonly CondicionDeLead[],
  conTope = true,
): readonly CondicionDeLead[] {
  return condiciones.filter((condicion) => !esDeCandidatos(condicion, conTope))
}

// Cuántas ventanas se piden, a lo sumo, antes de volver al camino de siempre: las que hacen falta para llenar la página si cada ventana trae
// la mitad de lo que se pide, más dos. Un filtro de quien mira que deja pasar pocos (favoritos y un nombre común) no se queda pidiendo
// ventanas: cuesta, como mucho, lo que costaba.
export const CANDIDATOS_POR_VENTANA_ESPERADOS = 100
export function ventanasHasta(tamano: number): number {
  return Math.ceil((tamano + 1) / CANDIDATOS_POR_VENTANA_ESPERADOS) + 2
}
