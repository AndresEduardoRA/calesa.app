// Lo que la vista previa del editor de la fórmula necesita saber de afuera (4.21-3a-2, P5): los tipos de cambio de hoy y las tablas vivas del origen, y las
// reglas puras para leerlos desde el navegador: qué claves se piden, qué tabla gana si hay dos, qué tablas de una página de filas están enteras y qué se avisa de
// lo que no se pudo leer. Sin I/O: la lectura es de `infra/formula/consulta-del-terreno-de-prueba.ts`. La entrada del motor sale de aquí con los datos en 0.
import type { Formula, FilaDeTabla } from '../formula'
import type { Entrada } from '../motor-entrada'
import type { Nodo } from '../nodos'

// PostgREST no devuelve más de 1.000 filas por pedido (`max_rows`, `supabase/config.toml`): una página de menos es entera y una de exactamente 1.000 puede estar cortada.
export const FILAS_POR_PAGINA = 1000
export const MAXIMO_DE_PEDIDOS_DE_FILAS = 6
export const MAXIMO_DE_TABLAS_VIVAS = 40
export const MAXIMO_DE_CLAVES_DE_CAMBIO = 100

export type AvisoDelTerreno =
  // No hay una tabla activa con esa clave, ni del origen ni compartida.
  | { codigo: 'tabla_ausente'; clave: string }
  // Tiene 1.000 filas o más: la vista previa no la lee.
  | { codigo: 'tabla_grande'; clave: string }
  // Quedó pendiente tras los pedidos de filas que se permiten.
  | { codigo: 'tabla_sin_leer'; clave: string }
  // Sus filas no tienen la forma que la fórmula sabe leer.
  | { codigo: 'tabla_ilegible'; clave: string }
  | { codigo: 'cambio_ausente'; clave: string }
  | { codigo: 'mas_tablas' }
  | { codigo: 'mas_cambios' }

// Lo que la lectura devuelve: las tablas por clave (las que se leyeron enteras), los tipos de cambio por clave y lo que no se pudo.
export type TerrenoDePrueba = {
  tipos_cambio: Record<string, number>
  // La moneda en que está cada tipo de cambio (`moneda_a`): la de los «Total en Bs».
  monedas: Record<string, string>
  tablas: Record<string, FilaDeTabla[]>
  avisos: AvisoDelTerreno[]
}

export const TERRENO_VACIO: TerrenoDePrueba = {
  tipos_cambio: {},
  monedas: {},
  tablas: {},
  avisos: [],
}

const tablaDe = (n: Nodo): string | null =>
  n.tipo === 'tabla' || n.tipo === 'tramo' || (n.tipo === 'calculo' && n.op === 'depreciar')
    ? n.tabla
    : null

// Las tablas que un nodo nombra y la fórmula no congeló (`params.tablas`, aunque esté vacía: D5), sin repetir y en el orden de la lista. Las vivas de `evaluar_formula()`.
export function tablasVivasDe(formula: Formula): string[] {
  const vistas = new Set<string>()
  const vivas: string[] = []
  for (const n of formula.definicion.nodos) {
    const clave = tablaDe(n)
    if (clave === null || vistas.has(clave)) continue
    vistas.add(clave)
    if (!Object.hasOwn(formula.params.tablas, clave)) vivas.push(clave)
  }
  return vivas
}

// Las claves de los nodos `tipo_cambio`, sin repetir y en el orden de la lista.
export function clavesDeCambioDe(formula: Formula): string[] {
  const claves = new Set<string>()
  for (const n of formula.definicion.nodos) {
    if (n.tipo === 'tipo_cambio') claves.add(n.clave)
  }
  return [...claves]
}

export type TablaCandidata = {
  id: string
  origen_id: string | null
  clave: string
  activa: boolean
}

// La tabla de cada clave: la del origen si está activa y, si no, la compartida activa (`origen_id` nulo), como `evaluar_formula()` (`base.sql`, «las tablas vivas»).
// Devuelve clave → id de la tabla elegida; la clave sin ninguna activa no está.
export function elegirTablas(
  candidatas: readonly TablaCandidata[],
  origenId: string,
): Map<string, string> {
  const delOrigen = new Map<string, string>()
  const compartidas = new Map<string, string>()
  for (const t of candidatas) {
    if (!t.activa) continue
    if (t.origen_id === origenId) delOrigen.set(t.clave, t.id)
    else if (t.origen_id === null) compartidas.set(t.clave, t.id)
  }
  const elegidas = new Map<string, string>()
  for (const [clave, id] of compartidas) elegidas.set(clave, id)
  for (const [clave, id] of delOrigen) elegidas.set(clave, id)
  return elegidas
}

export type FilaLeida = { tabla_id: string; valores: unknown }

export type PaginaAceptada = {
  // Las tablas que la página trajo enteras, con sus filas en el orden en que llegaron.
  aceptadas: Map<string, unknown[]>
  // Las que siguen sin leer: se piden de nuevo, sin las aceptadas.
  pendientes: string[]
  // La que ocupa una página entera sola: tiene 1.000 filas o más y no se usa.
  descartada: string | null
}

// Qué tablas de una página de filas (ordenada por `tabla_id, orden, id`) están enteras. Una página de menos de `FILAS_POR_PAGINA` lo está toda: las pendientes que no trajo
// filas están vacías. Una de exactamente `FILAS_POR_PAGINA` puede estar cortada: la última `tabla_id` se deja pendiente y las anteriores, que el orden garantiza enteras,
// se aceptan; si es una sola tabla, tiene 1.000 filas o más y se descarta. Las pendientes que la página no alcanzó **siguen pendientes**: jamás se aceptan como
// vacías. `pendientes_siguientes = pendientes − aceptadas − descartada`.
export function aceptarPagina(
  pendientes: readonly string[],
  filas: readonly FilaLeida[],
): PaginaAceptada {
  const enPendientes = new Set(pendientes)
  const porTabla = new Map<string, unknown[]>()
  for (const f of filas) {
    if (!enPendientes.has(f.tabla_id)) continue
    const de = porTabla.get(f.tabla_id)
    if (de) de.push(f.valores)
    else porTabla.set(f.tabla_id, [f.valores])
  }
  if (filas.length < FILAS_POR_PAGINA) {
    const aceptadas = new Map<string, unknown[]>()
    for (const id of pendientes) aceptadas.set(id, porTabla.get(id) ?? [])
    return { aceptadas, pendientes: [], descartada: null }
  }
  const ultima = filas.at(-1)?.tabla_id
  const aceptadas = new Map<string, unknown[]>()
  for (const [id, de] of porTabla) {
    if (id !== ultima) aceptadas.set(id, de)
  }
  const descartada = porTabla.size === 1 && ultima !== undefined ? ultima : null
  const siguientes = pendientes.filter((id) => !aceptadas.has(id) && id !== descartada)
  return { aceptadas, pendientes: siguientes, descartada }
}

// Lo que se dice de lo que no se pudo leer, en el orden de los avisos.
export function avisosDelTerreno(terreno: TerrenoDePrueba, nombreDelOrigen: string): string[] {
  return terreno.avisos.map((a) => {
    switch (a.codigo) {
      case 'tabla_ausente':
        return `No hay una tabla «${a.clave}» activa en ${nombreDelOrigen} ni compartida.`
      case 'tabla_grande':
        return `La tabla «${a.clave}» tiene 1.000 filas o más: la vista previa no la lee.`
      case 'tabla_sin_leer':
        return `La tabla «${a.clave}» no se pudo leer entera: la vista previa no la usa.`
      case 'tabla_ilegible':
        return `La tabla «${a.clave}» tiene filas que la fórmula no sabe leer.`
      case 'cambio_ausente':
        return `No hay un tipo de cambio activo «${a.clave}».`
      case 'mas_tablas':
        return `La fórmula nombra más de ${MAXIMO_DE_TABLAS_VIVAS} tablas: se leen las primeras ${MAXIMO_DE_TABLAS_VIVAS}.`
      case 'mas_cambios':
        return `La fórmula nombra más de ${MAXIMO_DE_CLAVES_DE_CAMBIO} tipos de cambio: se leen los primeros ${MAXIMO_DE_CLAVES_DE_CAMBIO}.`
      default: {
        const _: never = a
        return _
      }
    }
  })
}

// La entrada del motor con las cifras de prueba (P5): los datos en 0, las opciones apagadas, la variante por defecto, sin overrides y el vehículo vacío.
export function entradaDePrueba(terreno: TerrenoDePrueba): Entrada {
  return {
    inputs: {},
    banderas: {},
    tipos_cambio: terreno.tipos_cambio,
    vehiculo: {},
    tablas: terreno.tablas,
    overrides: {},
  }
}
