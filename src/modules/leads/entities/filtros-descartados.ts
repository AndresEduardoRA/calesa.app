// Lo que la URL de un listado de leads traía y ya no vale (un campo desactivado, no filtrable o inexistente, o una
// etiqueta que ya no es de quien mira): se dice y se quita con «Entendido». Salió de `filtros.ts` (9h).
import {
  camposFiltrables,
  cumpleElMinimo,
  filtroDeCampo,
  type ParametrosDeUrl,
} from '@/shared/lib/filtros'
import { MINIMO_DEL_TEXTO_DE_UN_CAMPO } from './busqueda-de-leads'
import type { CampoDeLead } from './campo'
import type { Etiqueta } from './etiqueta'
import { PREFIJO_DE_FILTRO } from './filtros'
import { FILTRO_ETIQUETA, etiquetasDescartadas } from './filtros-de-marcas'

export type MotivoDeFiltroDescartado =
  | 'desactivado'
  | 'no_filtrable'
  | 'inexistente'
  | 'etiqueta'
  // Un texto de un campo con menos de 3 letras o dígitos seguidos (4.03, 5a-9): una URL escrita a mano o una vista guardada antes del mínimo.
  | 'texto_corto'

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

// El filtro de texto de un campo vigente cuyo valor no alcanza el mínimo: `leerFiltros()` lo descarta sin romper y esto es lo que permite decirlo.
function esTextoCorto(
  campo: CampoDeLead,
  nombre: string,
  valor: string | string[] | undefined | null,
): boolean {
  const texto = Array.isArray(valor) ? valor[0] : valor
  return (
    nombre === PREFIJO_DE_FILTRO + campo.clave &&
    typeof texto === 'string' &&
    filtroDeCampo(campo, '')?.tipo === 'texto' &&
    !cumpleElMinimo(texto, MINIMO_DEL_TEXTO_DE_UN_CAMPO)
  )
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
    if (clave === null) {
      continue
    }
    if (vigentes.has(clave)) {
      const campo = porClave.get(clave)
      if (campo && esTextoCorto(campo, nombre, valor)) {
        descartados.set(clave, {
          clave,
          etiqueta: campo.etiqueta,
          motivo: 'texto_corto',
          parametros: [nombre],
        })
      }
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
  if (motivo === 'texto_corto') {
    return `Se quitó el filtro «${etiqueta}»: escribe al menos 3 letras.`
  }
  return motivo === 'desactivado'
    ? `Se quitó el filtro «${etiqueta}»: ese campo está desactivado.`
    : `Se quitó el filtro «${etiqueta}»: ese campo ya no se puede filtrar.`
}
