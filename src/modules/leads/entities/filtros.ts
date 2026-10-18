// Los filtros del listado de leads, en dos secciones: «Tus marcas» (tachados, favoritos y
// etiquetas: `filtros-de-marcas.ts`) y «Datos del lead» (tipo y origen del lead, y uno por cada
// campo «filtrable» del layout), más la búsqueda por nombre o número. De acá salen el esquema que
// dibuja `FilterShell` y las condiciones que `infra/` le pasa a la base. Lo que decide qué filas hay
// es la RLS: filtrar por un privado ajeno no encuentra nada, y la pantalla lo dice.
import {
  camposFiltrables,
  condicionDeCampo,
  filtroDeCampo,
  type CondicionDeAtributo,
  type EsquemaDeFiltros,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import type { OrigenDeLead } from './alta'
import { idsDeLasClaves, opcionesDeTipo, type TipoDeLeadEnCatalogo } from './catalogos'
import { columnaParaFiltrar, type CampoDeLead, type ColumnaDeAtributos } from './campo'
import type { Etiqueta } from './etiqueta'
import {
  SECCIONES_DEL_LISTADO,
  SECCION_DATOS,
  condicionesDeMarcas,
  filtrosDeMarcas,
  type CondicionDeMarca,
} from './filtros-de-marcas'

export const FILTRO_TIPO = 'tipo'
export const FILTRO_ORIGEN = 'origen'
// Las claves de los campos del layout llevan este prefijo en la URL: una clave de campo no lleva
// punto, así que nunca choca con `tipo`, `origen`, `alcance`, `cursor` ni `lead`.
export const PREFIJO_DE_FILTRO = 'a.'

const BUSQUEDA = { clave: 'q', etiqueta: 'Buscar por nombre o número' }

// Quien ve «todos» filtra sólo entre sus leads cuando el campo es privado.
const AYUDA_DE_PRIVADO = 'Solo busca en tus leads: de los demás no recibes este dato.'

type Fuentes = {
  campos: readonly CampoDeLead[]
  // Todos, también los desactivados (un lead puede conservar uno apagado); sin `activo` cuenta como activo.
  origenes: readonly (OrigenDeLead & { activo?: boolean })[]
  // Los tipos de lead, también los desactivados: son las opciones del filtro de tipo (sus nombres salen de la base).
  tipos: readonly TipoDeLeadEnCatalogo[]
  // Tiene el alcance «todos»: para él un filtro privado necesita su aclaración.
  verTodos: boolean
  // Las de quien mira: las opciones del filtro de etiquetas.
  etiquetas: readonly Etiqueta[]
}

// Las opciones del filtro de origen: primero los activos, en el orden de la configuración, y después
// los desactivados marcados «(inactivo)» (hay leads que todavía los tienen, y se filtran igual).
export function opcionesDeOrigen(
  origenes: readonly (OrigenDeLead & { activo?: boolean })[],
): { valor: string; etiqueta: string }[] {
  const activos = origenes.filter((origen) => origen.activo !== false)
  const apagados = origenes.filter((origen) => origen.activo === false)
  return [
    ...activos.map((origen) => ({ valor: origen.id, etiqueta: origen.nombre })),
    ...apagados.map((origen) => ({ valor: origen.id, etiqueta: `${origen.nombre} (inactivo)` })),
  ]
}

export function esquemaDeFiltrosDeLeads(fuentes: Fuentes): EsquemaDeFiltros {
  const { campos, origenes, tipos, verTodos } = fuentes
  const fijos: EsquemaDeFiltros['filtros'][number][] = []
  if (tipos.length > 0) {
    fijos.push({
      tipo: 'opciones',
      clave: FILTRO_TIPO,
      etiqueta: 'Tipo',
      seccion: SECCION_DATOS,
      opciones: opcionesDeTipo(tipos),
    })
  }
  if (origenes.length > 0) {
    fijos.push({
      tipo: 'opciones',
      clave: FILTRO_ORIGEN,
      etiqueta: 'Origen del lead',
      seccion: SECCION_DATOS,
      opciones: opcionesDeOrigen(origenes),
    })
  }
  const delLayout = camposFiltrables(campos).flatMap((campo) => {
    const filtro = filtroDeCampo(
      campo,
      PREFIJO_DE_FILTRO,
      campo.soloCartera && verTodos ? AYUDA_DE_PRIVADO : undefined,
    )
    return filtro ? [{ ...filtro, seccion: SECCION_DATOS }] : []
  })
  return {
    busqueda: BUSQUEDA,
    secciones: SECCIONES_DEL_LISTADO,
    filtros: [...filtrosDeMarcas(fuentes.etiquetas), ...fijos, ...delLayout],
  }
}

// Lo que se le pide a la base, sin decir cómo: `infra/queries/condiciones.ts` lo traduce.
export type CondicionDeLead =
  // Contiene el texto en el nombre o, si el texto es un número, es el lead con ese número. `idsDelNumero`: los leads con
  // ese número que la persona ve, que resolvió quien arma la consulta (vacío si ninguno). `soloNumero`: se escribió «#124»,
  // que busca únicamente por número.
  | {
      tipo: 'busqueda'
      texto: string
      numero: number | null
      soloNumero: boolean
      idsDelNumero: readonly string[]
    }
  | { tipo: 'columna_en'; columna: 'tipo_lead_id' | 'origen_lead_id'; valores: string[] }
  // «Míos»: el lead está en la cartera de quien mira.
  | { tipo: 'en_cartera' }
  | (CondicionDeAtributo & { columna: ColumnaDeAtributos })
  | CondicionDeMarca

// Un número de lead son hasta 15 dígitos: cabe entero en un `number` sin perder nada.
const NUMERO_DE_LEAD = /^\d{1,15}$/

// «124» busca el lead con ese número y también los nombres que contienen «124»; «#124» busca sólo el número. El número
// es el que la persona ve primero (el global con el permiso, el propio sin él: lo resuelve la base). Nunca el teléfono:
// buscar dígitos sobre lo ajeno sería un oráculo para saber si un número ya está cargado.
export function interpretarBusqueda(
  texto: string,
): { texto: string; numero: number | null; soloNumero: boolean } | null {
  const recortado = texto.trim()
  const limpio = recortado.replace(/^#/, '').trim()
  if (limpio === '') {
    return null
  }
  const numero = NUMERO_DE_LEAD.test(limpio) ? Number(limpio) : null
  return { texto: limpio, numero, soloNumero: numero !== null && recortado.startsWith('#') }
}

// Los filtros por campo del layout, cada uno sobre su columna (`columnaParaFiltrar()`). La clave de un atributo sale
// siempre del layout (nunca de la URL): un filtro de un campo que ya no es filtrable se ignora.
function condicionesDeCampos(
  campos: readonly CampoDeLead[],
  valores: ValoresDeFiltros,
  zona: string | undefined,
): CondicionDeLead[] {
  const porClave = new Map(
    camposFiltrables(campos).map((campo) => [PREFIJO_DE_FILTRO + campo.clave, campo]),
  )
  return Object.entries(valores.porClave).flatMap(([clave, valor]) => {
    const campo = porClave.get(clave)
    const condicion = campo ? condicionDeCampo(campo, valor, zona) : null
    return campo && condicion ? [{ ...condicion, columna: columnaParaFiltrar(campo) }] : []
  })
}

// Tipo y origen del lead: columnas de la fila. El filtro de tipo lleva claves en la URL (`?tipo=cliente`: no cambian nunca) y la
// base filtra por el id: se traducen con el catálogo.
function condicionesDeColumnas(
  valores: ValoresDeFiltros,
  tipos: readonly TipoDeLeadEnCatalogo[],
): CondicionDeLead[] {
  return Object.entries(valores.porClave).flatMap(([clave, valor]): CondicionDeLead[] => {
    if (valor.tipo !== 'opciones') return []
    if (clave === FILTRO_TIPO) {
      return [
        {
          tipo: 'columna_en',
          columna: 'tipo_lead_id',
          valores: idsDeLasClaves(tipos, valor.valores),
        },
      ]
    }
    if (clave === FILTRO_ORIGEN) {
      return [{ tipo: 'columna_en', columna: 'origen_lead_id', valores: valor.valores }]
    }
    return []
  })
}

// Las condiciones de lo que la persona filtró.
export function condicionesDeLeads(
  campos: readonly CampoDeLead[],
  valores: ValoresDeFiltros,
  // `idsDelNumero`: lo que resolvió la base para el número buscado (ver `leerIdsDelNumero`); sin él, ninguno.
  opciones: {
    zona?: string
    soloMios: boolean
    idsDelNumero?: readonly string[]
    // El catálogo de tipos: traduce las claves de `?tipo=` a ids.
    tipos?: readonly TipoDeLeadEnCatalogo[]
  },
): CondicionDeLead[] {
  const condiciones: CondicionDeLead[] = []
  const busqueda = interpretarBusqueda(valores.busqueda)
  if (busqueda) {
    condiciones.push({ tipo: 'busqueda', ...busqueda, idsDelNumero: opciones.idsDelNumero ?? [] })
  }
  const deCampos = condicionesDeCampos(campos, valores, opciones.zona)
  // Un filtro sobre lo recortado sólo encuentra leads de la cartera (fuera de ella la clave no llega): decirlo deja a la
  // base recorrer sólo la cartera. No cambia qué se encuentra.
  const porUnPrivado = deCampos.some((c) => 'columna' in c && c.columna === 'atributos')
  if (opciones.soloMios || porUnPrivado) {
    condiciones.push({ tipo: 'en_cartera' })
  }
  return [
    ...condiciones,
    ...deCampos,
    ...condicionesDeColumnas(valores, opciones.tipos ?? []),
    ...condicionesDeMarcas(valores),
  ]
}

// Los campos privados por los que se está filtrando: con «todos» el resultado es sólo lo que está
// en la cartera de quien mira, y la pantalla tiene que decirlo.
export function privadosFiltrando(
  campos: readonly CampoDeLead[],
  valores: ValoresDeFiltros,
): string[] {
  return camposFiltrables(campos)
    .filter(
      (campo) =>
        campo.soloCartera && valores.porClave[PREFIJO_DE_FILTRO + campo.clave] !== undefined,
    )
    .map((campo) => campo.etiqueta)
}
