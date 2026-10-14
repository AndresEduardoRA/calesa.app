// Traduce las condiciones del inventario a filtros de PostgREST. Todo valor que escribió la
// persona pasa por los saneadores de acá: dentro de un `or()` una coma, un paréntesis o una
// comilla sin escapar rompen el filtro entero (400).
import type { Cursor } from '@/shared/lib/paginacion'
import type { Condicion } from '../../entities/filtros'

// Un valor dentro de `or()` / `and()`: entre comillas, con `\` y `"` escapados.
export function citar(valor: string): string {
  return `"${valor.replace(/[\\"]/g, '\\$&')}"`
}

// El patrón «contiene» de un `ilike`: lo que escribió la persona es literal. `%` y `_` dejan de
// ser comodines, y `*` (que PostgREST siempre trata como comodín) pasa a ser «un carácter».
export function patronContiene(texto: string): string {
  return `*${texto.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '_')}*`
}

// Lo que se usa del constructor de consultas de PostgREST. Así se prueba sin base.
export type Filtrable<Consulta> = {
  in: (columna: string, valores: readonly string[]) => Consulta
  eq: (columna: string, valor: boolean) => Consulta
  is: (columna: string, valor: null) => Consulta
  gte: (columna: string, valor: string | number) => Consulta
  lte: (columna: string, valor: string | number) => Consulta
  lt: (columna: string, valor: string | number) => Consulta
  ilike: (columna: string, patron: string) => Consulta
  contains: (columna: string, valor: Record<string, unknown>) => Consulta
  or: (filtros: string) => Consulta
}

type Rango = {
  columna: string
  desde: string | number | null
  hasta: string | number | null
  // «Antes de» en vez de «hasta e inclusive».
  hastaExclusivo?: boolean
}

function rango<Consulta extends Filtrable<Consulta>>(consulta: Consulta, pedido: Rango): Consulta {
  const { columna, desde, hasta, hastaExclusivo = false } = pedido
  const conDesde = desde === null ? consulta : consulta.gte(columna, desde)
  if (hasta === null) {
    return conDesde
  }
  return hastaExclusivo ? conDesde.lt(columna, hasta) : conDesde.lte(columna, hasta)
}

function columnaEn<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condicion: Extract<Condicion, { tipo: 'columna_en' }>,
): Consulta {
  const { columna, valores, incluirNulo } = condicion
  if (!incluirNulo) {
    return consulta.in(columna, valores)
  }
  // Los valores son ids que el esquema ya validó contra las opciones: no llevan nada que escapar.
  return valores.length === 0
    ? consulta.is(columna, null)
    : consulta.or(`${columna}.is.null,${columna}.in.(${valores.join(',')})`)
}

function atributosContienen<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  alternativas: readonly Record<string, unknown>[],
): Consulta {
  const [unica, ...resto] = alternativas
  if (!unica) {
    return consulta
  }
  return resto.length === 0
    ? consulta.contains('atributos', unica)
    : consulta.or(alternativas.map((una) => `atributos.cs.${citar(JSON.stringify(una))}`).join(','))
}

// «En vitrina» = publicado y en una fase que hoy publica. Las fases llegan resueltas por la base
// y son ids: no llevan nada que escapar. Sin ninguna, nada está en vitrina: «sí» no trae filas
// (un `in` vacío) y «no» las trae todas.
function enVitrina<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  { valor, fases }: Extract<Condicion, { tipo: 'en_vitrina' }>,
): Consulta {
  if (valor) {
    return consulta.eq('publicado_web', true).in('fase_id', fases)
  }
  return fases.length === 0
    ? consulta
    : consulta.or(`publicado_web.is.false,fase_id.is.null,fase_id.not.in.(${fases.join(',')})`)
}

// «Se limpiará pronto» = importado de apibara y con `limpieza_el` hasta ese día. La fecha la calcula
// la base (`limpieza_el()`, columna calculada: nunca se reconstruye acá), y es nula si el vehículo
// no aplica o tiene una ancla, así que lo retenido nunca entra. `hasta` lo calcula la página (un
// día, no texto de la persona).
function porLimpiar<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  { valor, hasta }: Extract<Condicion, { tipo: 'por_limpiar' }>,
): Consulta {
  if (valor) {
    return consulta.eq('importado_apibara', true).lte('limpieza_el', hasta)
  }
  return consulta.or(`importado_apibara.is.false,limpieza_el.is.null,limpieza_el.gt.${hasta}`)
}

function aplicarUna<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condicion: Condicion,
): Consulta {
  switch (condicion.tipo) {
    case 'busqueda': {
      const patron = citar(patronContiene(condicion.texto))
      return consulta.or(`titulo.ilike.${patron},vin.ilike.${patron},lote.ilike.${patron}`)
    }
    case 'columna_en':
      return columnaEn(consulta, condicion)
    case 'columna_rango':
      return rango(consulta, {
        columna: condicion.columna,
        desde: condicion.min,
        hasta: condicion.max,
      })
    case 'en_vitrina':
      return enVitrina(consulta, condicion)
    case 'por_limpiar':
      return porLimpiar(consulta, condicion)
    case 'atributos_contienen':
      return atributosContienen(consulta, condicion.alternativas)
    case 'atributo_rango_numero':
      // `->`: compara como jsonb, que entre números es numérico.
      return rango(consulta, {
        columna: `atributos->${condicion.clave}`,
        desde: condicion.min,
        hasta: condicion.max,
      })
    case 'atributo_rango_texto':
      return rango(consulta, {
        columna: `atributos->>${condicion.clave}`,
        desde: condicion.desde,
        hasta: condicion.antesDe,
        hastaExclusivo: true,
      })
    case 'atributo_texto':
      return consulta.ilike(`atributos->>${condicion.clave}`, patronContiene(condicion.texto))
  }
}

export function aplicarCondiciones<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condiciones: readonly Condicion[],
): Consulta {
  return condiciones.reduce((parcial, condicion) => aplicarUna(parcial, condicion), consulta)
}

// Keyset `(creado_en, id)`. El borde sobre `creado_en` va como condición propia para que entre al
// índice del listado; el `or` desempata por id dentro del mismo instante. Varios `or` de una
// misma consulta se combinan con AND. El cursor ya viene validado (`leerCursor`).
export function aplicarCursor<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  cursor: Cursor | null,
): Consulta {
  if (cursor === null) {
    return consulta
  }
  const instante = citar(cursor.creadoEn)
  return cursor.sentido === 'siguiente'
    ? consulta.lte('creado_en', cursor.creadoEn).or(`creado_en.lt.${instante},id.lt.${cursor.id}`)
    : consulta.gte('creado_en', cursor.creadoEn).or(`creado_en.gt.${instante},id.gt.${cursor.id}`)
}
