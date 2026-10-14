// Los filtros del listado de leads: dos fijos (tipo y origen del lead), la búsqueda por nombre o
// número y uno por cada campo «filtrable» del layout. De acá salen el esquema que dibuja
// `FilterShell` y las condiciones que `infra/` le pasa a la base. Lo que decide qué filas hay es la
// RLS: filtrar por un privado ajeno no encuentra nada, y la pantalla lo dice.
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
  origenes: readonly OrigenDeLead[]
  // Tiene el alcance «todos»: para él un filtro privado necesita su aclaración.
  verTodos: boolean
}

export function esquemaDeFiltrosDeLeads({ campos, origenes, verTodos }: Fuentes): EsquemaDeFiltros {
  const fijos: EsquemaDeFiltros['filtros'][number][] = [
    {
      tipo: 'opciones',
      clave: FILTRO_TIPO,
      etiqueta: 'Tipo',
      opciones: TIPOS_DEL_LEAD.map((tipo) => ({ valor: tipo, etiqueta: ETIQUETA_DEL_TIPO[tipo] })),
    },
  ]
  if (origenes.length > 0) {
    fijos.push({
      tipo: 'opciones',
      clave: FILTRO_ORIGEN,
      etiqueta: 'Origen del lead',
      opciones: origenes.map((origen) => ({ valor: origen.id, etiqueta: origen.nombre })),
    })
  }
  const delLayout = camposFiltrables(campos).flatMap(
    (campo) =>
      filtroDeCampo(
        campo,
        PREFIJO_DE_FILTRO,
        campo.soloCartera && verTodos ? AYUDA_DE_PRIVADO : undefined,
      ) ?? [],
  )
  return { busqueda: BUSQUEDA, filtros: [...fijos, ...delLayout] }
}

// Lo que se le pide a la base, sin decir cómo: `infra/queries/condiciones.ts` lo traduce.
export type CondicionDeLead =
  // Contiene el texto en el nombre o, si el texto es un número, es el número del lead.
  | { tipo: 'busqueda'; texto: string; numero: number | null }
  | { tipo: 'columna_en'; columna: 'tipo' | 'origen_lead_id'; valores: string[] }
  // «Míos»: el lead está en la cartera de quien mira.
  | { tipo: 'en_cartera' }
  | CondicionDeAtributo

// Un número de lead son hasta 15 dígitos: cabe entero en un `number` sin perder nada.
const NUMERO_DE_LEAD = /^\d{1,15}$/

// «#124» o «124» busca el lead 124 y también los nombres que contienen «124». Nunca el teléfono:
// buscar dígitos sobre lo ajeno sería un oráculo para saber si un número ya está cargado.
export function interpretarBusqueda(
  texto: string,
): { texto: string; numero: number | null } | null {
  const limpio = texto.trim().replace(/^#/, '').trim()
  if (limpio === '') {
    return null
  }
  return { texto: limpio, numero: NUMERO_DE_LEAD.test(limpio) ? Number(limpio) : null }
}

// Las condiciones de lo que la persona filtró. La clave de un atributo sale siempre del layout
// (nunca de la URL): un filtro de un campo que ya no es filtrable se ignora.
export function condicionesDeLeads(
  campos: readonly CampoDeLead[],
  valores: ValoresDeFiltros,
  opciones: { zona?: string; soloMios: boolean },
): CondicionDeLead[] {
  const condiciones: CondicionDeLead[] = []
  const busqueda = interpretarBusqueda(valores.busqueda)
  if (busqueda) {
    condiciones.push({ tipo: 'busqueda', ...busqueda })
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
  return condiciones
}

// --- Lo que la URL traía y ya no vale ----------------------------------------------------------------

export type MotivoDeFiltroDescartado = 'desactivado' | 'no_filtrable' | 'inexistente'

export type FiltroDescartado = {
  // La clave del campo (sin el prefijo).
  clave: string
  // Su etiqueta, si el campo todavía existe.
  etiqueta: string | null
  motivo: MotivoDeFiltroDescartado
  // Los parámetros de la URL que lo componen (`a.edad.min`, `a.edad.max`): lo que se quita.
  parametros: string[]
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
