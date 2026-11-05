// El panel del cliente de la hoja de cotizar (`?panel=cliente`): elegir el lead de la cotización. Sin buscar, «míos» —la cartera de quien mira— por lo
// más reciente (`reciente_en`: el último seguimiento del lead o su alta), con las pestañas «Todos», «Prospecto» y «Cliente»; buscando, los leads que quien
// mira ve y coinciden por nombre o por número, como el listado. Las dos listas van por cursor sobre la columna que las ordena (`OrdenDeCursor`) y las
// sostienen `leads_asesores_reciente_idx` (4.14-3a) y la ventana de candidatos (5a-fix-1b); `docs/RENDIMIENTO.md`, panel del cliente. Puro: sin base.
import { z } from 'zod'
import type { Resultado } from '@/shared/lib/errores'
import type { Cursor, OrdenDeCursor } from '@/shared/lib/paginacion'
import { POR_ALTA } from '@/shared/lib/paginacion'
import { CAMPOS_DE_NUMEROS, numerosDesde, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { interpretarBusqueda, MINIMO_DE_BUSQUEDA } from './busqueda-de-leads'
import type { FiltrosDeCandidatos } from './candidatos'
import type { TipoDeLeadEnCatalogo } from './catalogos'
import { NOMBRE_DE_CLASE, type ClaseDeTipoDeLead } from './tipo-de-lead'

// Las pestañas del panel (`?clase=`): «Todos» no filtra y las otras dos son las clases del tipo del lead. Abre en la primera.
export const PESTANAS_DEL_PANEL = ['todos', 'prospecto', 'cliente'] as const
export type PestanaDelPanel = (typeof PESTANAS_DEL_PANEL)[number]
// Lo que el panel lee: una pestaña o, mientras hay un texto que buscar (`?buscar=`), la búsqueda. La búsqueda no es una pestaña.
export type ListaDelPanel = PestanaDelPanel | 'busqueda'

export const TITULO_DE_LA_PESTANA: Record<PestanaDelPanel, string> = {
  todos: 'Todos',
  prospecto: NOMBRE_DE_CLASE.prospecto,
  cliente: NOMBRE_DE_CLASE.cliente,
}

// La pestaña de `?clase=`: otra cosa o nada, la primera.
export function pestanaDelPanel(valor: string | null): PestanaDelPanel {
  return PESTANAS_DEL_PANEL.find((pestana) => pestana === valor) ?? PESTANAS_DEL_PANEL[0]
}

// Los tipos de una clase, activos o no: un lead puede conservar un tipo apagado y sigue siendo de su clase.
export function idsDeTiposDeLaClase(
  tipos: readonly TipoDeLeadEnCatalogo[],
  clase: ClaseDeTipoDeLead,
): string[] {
  return tipos.filter((tipo) => tipo.clase === clase).map((tipo) => tipo.id)
}

// La columna y el orden de cada lista: lo que leen `aplicarCursor()` y `ordenarPorCursor()`. La búsqueda va de lo más nuevo a lo más viejo por alta,
// el orden de los candidatos.
const RECIENTE: OrdenDeCursor = { columna: 'reciente_en', ascendente: false }
export const ORDEN_DEL_PANEL: Record<ListaDelPanel, OrdenDeCursor> = {
  todos: RECIENTE,
  prospecto: RECIENTE,
  cliente: RECIENTE,
  busqueda: POR_ALTA,
}

// Lo que se pide de cada lead: lo que dibuja su fila (el nombre, los números, el tipo) y el instante por el que pagina su lista.
const COLUMNAS_COMUNES = 'id, nombre, tipo_lead_id, numero, numero_propio, numero_propio_creador'
export function columnasDelPanel(lista: ListaDelPanel): string {
  return `${COLUMNAS_COMUNES}, ${lista === 'busqueda' ? 'creado_en' : 'reciente_en'}`
}

export type ClienteDelPanel = {
  id: string
  nombre: string
  tipoId: string | null
  numeros: NumerosDeLead
  // Sólo uno de los dos instantes llega, según la lista (`columnasDelPanel()`).
  recienteEn: string | null
  creadoEn: string | null
}

const esquemaDelPanel = z.array(
  z.object({
    id: z.guid(),
    nombre: z.string(),
    tipo_lead_id: z.guid().nullable(),
    reciente_en: z.string().nullish(),
    creado_en: z.string().nullish(),
    ...CAMPOS_DE_NUMEROS,
  }),
)

// El instante por el que pagina cada lista; el filtro de la lectura garantiza que no es nulo.
export function instanteDelPanel(lista: ListaDelPanel, cliente: ClienteDelPanel): string | null {
  return lista === 'busqueda' ? cliente.creadoEn : cliente.recienteEn
}

// Las filas de una lista, en el orden en que llegaron. Una rota, o sin el instante de su lista (el cursor no sabría por dónde seguir), hace de la
// lectura un error (`null`), nunca una fila ni «ninguno».
export function clientesDelPanelDesde(
  filas: unknown,
  lista: ListaDelPanel,
): ClienteDelPanel[] | null {
  const leidas = esquemaDelPanel.safeParse(filas)
  if (!leidas.success) {
    return null
  }
  const clientes = leidas.data.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    tipoId: fila.tipo_lead_id,
    numeros: numerosDesde(fila),
    recienteEn: fila.reciente_en ?? null,
    creadoEn: fila.creado_en ?? null,
  }))
  return clientes.every((cliente) => instanteDelPanel(lista, cliente) !== null) ? clientes : null
}

// Lo que se busca: el texto, el número que trae (si lo trae) y si es sólo el número. Lo decide `interpretarBusqueda()`, la del listado.
export type BusquedaDelPanel = NonNullable<ReturnType<typeof interpretarBusqueda>>

export type TextoDelPanel = {
  // Lo que se busca; null = no se busca (vacío o menos que el mínimo).
  busqueda: BusquedaDelPanel | null
  aviso: string | null
}

export function leerTextoDelPanel(texto: string): TextoDelPanel {
  if (texto.trim() === '') {
    return { busqueda: null, aviso: null }
  }
  const busqueda = interpretarBusqueda(texto)
  return busqueda === null
    ? { busqueda: null, aviso: MINIMO_DE_BUSQUEDA.aviso }
    : { busqueda, aviso: null }
}

// Lo que se le pide a `leads_candidatos()`: el texto, los leads con el número buscado (cuentan aunque el nombre no coincida) y la ventana que sigue al
// cursor, en el orden de alta. Nunca «míos»: el panel busca entre los leads que quien mira ve (P3 del 4.14-3b), como el listado. Una búsqueda sólo por
// número no tiene candidatos: son los ids del número (`null`).
export function pedidoDeCandidatos(
  busqueda: BusquedaDelPanel,
  idsDelNumero: readonly string[],
  cursor: Cursor | null,
): FiltrosDeCandidatos | null {
  if (busqueda.soloNumero) {
    return null
  }
  return {
    texto: busqueda.texto,
    sentido: cursor?.sentido ?? 'siguiente',
    ...(cursor ? { cursor: { creado_en: cursor.instante, id: cursor.id } } : {}),
    ...(idsDelNumero.length > 0 ? { extra: [...idsDelNumero] } : {}),
  }
}

// El lead elegido, como lo dibujan la barra y el panel: lo que la página le pasa al navegador.
export type ClienteElegido = Pick<ClienteDelPanel, 'id' | 'nombre' | 'tipoId' | 'numeros'>

const esquemaDelElegido = z.object({
  id: z.guid(),
  nombre: z.string(),
  tipo_lead_id: z.guid().nullable(),
  ...CAMPOS_DE_NUMEROS,
})

// La fila de `leads_vista` del lead de la URL; una forma rota es nula.
export function clienteElegidoDesde(fila: unknown): ClienteElegido | null {
  const leida = esquemaDelElegido.safeParse(fila)
  return leida.success
    ? {
        id: leida.data.id,
        nombre: leida.data.nombre,
        tipoId: leida.data.tipo_lead_id,
        numeros: numerosDesde(leida.data),
      }
    : null
}

// Lee el lead de la URL con la sesión de quien mira. `ok(null)`: la lectura respondió sin fila (no existe, está en la papelera o no se ve); un error de la
// lectura es un error, nunca «no se ve».
export type LectorDeClienteElegido = (id: string) => Promise<Resultado<ClienteElegido | null>>
