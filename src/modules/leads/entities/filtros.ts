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
  type ParametrosDeUrl,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'
import type { OrigenDeLead } from './alta'
import type { CampoDeLead } from './campo'
import type { Etiqueta } from './etiqueta'
import {
  FILTRO_ETIQUETA,
  SECCIONES_DEL_LISTADO,
  SECCION_DATOS,
  condicionesDeMarcas,
  etiquetasDescartadas,
  filtrosDeMarcas,
  type CondicionDeMarca,
} from './filtros-de-marcas'
import { ETIQUETA_DEL_TIPO, TIPOS_DEL_LEAD } from './listado'

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
  const { campos, origenes, verTodos } = fuentes
  const fijos: EsquemaDeFiltros['filtros'][number][] = [
    {
      tipo: 'opciones',
      clave: FILTRO_TIPO,
      etiqueta: 'Tipo',
      seccion: SECCION_DATOS,
      opciones: TIPOS_DEL_LEAD.map((tipo) => ({ valor: tipo, etiqueta: ETIQUETA_DEL_TIPO[tipo] })),
    },
  ]
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
  | { tipo: 'columna_en'; columna: 'tipo' | 'origen_lead_id'; valores: string[] }
  // «Míos»: el lead está en la cartera de quien mira.
  | { tipo: 'en_cartera' }
  | CondicionDeAtributo
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

// Las condiciones de lo que la persona filtró. La clave de un atributo sale siempre del layout
// (nunca de la URL): un filtro de un campo que ya no es filtrable se ignora.
export function condicionesDeLeads(
  campos: readonly CampoDeLead[],
  valores: ValoresDeFiltros,
  // `idsDelNumero`: lo que resolvió la base para el número buscado (ver `leerIdsDelNumero`); sin él, ninguno.
  opciones: { zona?: string; soloMios: boolean; idsDelNumero?: readonly string[] },
): CondicionDeLead[] {
  const condiciones: CondicionDeLead[] = []
  const busqueda = interpretarBusqueda(valores.busqueda)
  if (busqueda) {
    condiciones.push({ tipo: 'busqueda', ...busqueda, idsDelNumero: opciones.idsDelNumero ?? [] })
  }
  if (opciones.soloMios) {
    condiciones.push({ tipo: 'en_cartera' })
  }
  const porClave = new Map(
    camposFiltrables(campos).map((campo) => [PREFIJO_DE_FILTRO + campo.clave, campo]),
  )
  for (const [clave, valor] of Object.entries(valores.porClave)) {
    const campo = porClave.get(clave)
    if (campo) {
      const condicion = condicionDeCampo(campo, valor, opciones.zona)
      if (condicion) {
        condiciones.push(condicion)
      }
      continue
    }
    if (valor.tipo !== 'opciones') {
      continue
    }
    if (clave === FILTRO_TIPO) {
      condiciones.push({ tipo: 'columna_en', columna: 'tipo', valores: valor.valores })
    } else if (clave === FILTRO_ORIGEN) {
      condiciones.push({ tipo: 'columna_en', columna: 'origen_lead_id', valores: valor.valores })
    }
  }
  return [...condiciones, ...condicionesDeMarcas(valores)]
}

// --- Lo que la URL traía y ya no vale ----------------------------------------------------------------

export type MotivoDeFiltroDescartado = 'desactivado' | 'no_filtrable' | 'inexistente' | 'etiqueta'

export type FiltroDescartado = {
  // La clave del campo (sin el prefijo), o la del filtro de etiquetas.
  clave: string
  // Su etiqueta, si el campo todavía existe.
  etiqueta: string | null
  motivo: MotivoDeFiltroDescartado
  // Los parámetros de la URL que lo componen (`a.edad.min`, `a.edad.max`): lo que se quita.
  parametros: string[]
  // Con qué queda el parámetro en vez de quitarlo (las etiquetas que sí valen).
  queda?: string | null
  // Cuántas etiquetas ya no existen.
  cuantas?: number
}

const SUFIJOS_DE_RANGO = /\.(min|max|desde|hasta)$/

// La clave del campo a la que pertenece un parámetro de la URL (`a.edad.min` → `edad`); null si no
// es de un campo del layout o viene vacío.
function claveDeParametro(
  nombre: string,
  valor: string | string[] | null | undefined,
): string | null {
  const vacio = valor === undefined || valor === null || valor === '' || valor.length === 0
  if (vacio || !nombre.startsWith(PREFIJO_DE_FILTRO)) {
    return null
  }
  return nombre.slice(PREFIJO_DE_FILTRO.length).replace(SUFIJOS_DE_RANGO, '')
}

function motivoDe(campo: CampoDeLead | undefined): MotivoDeFiltroDescartado {
  if (!campo) {
    return 'inexistente'
  }
  return campo.activo ? 'no_filtrable' : 'desactivado'
}

// Los filtros de campos que traía la URL (una vista guardada, un enlace viejo) y que ya no se
// pueden aplicar: el campo se desactivó, dejó de ser filtrable o se eliminó. `leerFiltros()` los
// descarta sin romper; esto es lo que permite decirlo.
export function filtrosDescartados(
  campos: readonly CampoDeLead[],
  parametros: ParametrosDeUrl,
  etiquetas: readonly Etiqueta[] = [],
): FiltroDescartado[] {
  const deEtiquetas = etiquetasDescartadas(parametros, etiquetas)
  const descartadosDeEtiquetas: FiltroDescartado[] = deEtiquetas
    ? [
        {
          clave: FILTRO_ETIQUETA,
          etiqueta: null,
          motivo: 'etiqueta',
          parametros: [FILTRO_ETIQUETA],
          queda: deEtiquetas.quedan,
          cuantas: deEtiquetas.cuantas,
        },
      ]
    : []
  return [...descartadosDeCampos(campos, parametros), ...descartadosDeEtiquetas]
}

function descartadosDeCampos(
  campos: readonly CampoDeLead[],
  parametros: ParametrosDeUrl,
): FiltroDescartado[] {
  const porClave = new Map(campos.map((campo) => [campo.clave, campo]))
  const vigentes = new Set(camposFiltrables(campos).map((campo) => campo.clave))
  const descartados = new Map<string, FiltroDescartado>()
  for (const [nombre, valor] of Object.entries(parametros)) {
    const clave = claveDeParametro(nombre, valor)
    if (clave === null || vigentes.has(clave)) {
      continue
    }
    const previo = descartados.get(clave)
    if (previo) {
      previo.parametros.push(nombre)
      continue
    }
    const campo = porClave.get(clave)
    descartados.set(clave, {
      clave,
      etiqueta: campo?.etiqueta ?? null,
      motivo: motivoDe(campo),
      parametros: [nombre],
    })
  }
  return [...descartados.values()]
}

export function textoDeFiltroDescartado(descartado: FiltroDescartado): string {
  const { etiqueta, motivo } = descartado
  if (motivo === 'etiqueta') {
    return descartado.cuantas === 1 || descartado.cuantas === undefined
      ? 'Se quitó del filtro una etiqueta que ya no existe.'
      : `Se quitaron del filtro ${String(descartado.cuantas)} etiquetas que ya no existen.`
  }
  if (motivo === 'inexistente' || etiqueta === null) {
    return 'Se quitó un filtro de un campo que ya no existe.'
  }
  return motivo === 'desactivado'
    ? `Se quitó el filtro «${etiqueta}»: ese campo está desactivado.`
    : `Se quitó el filtro «${etiqueta}»: ese campo ya no se puede filtrar.`
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
