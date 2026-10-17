// Traduce a filtros de PostgREST lo que un listado le pide a la base. Todo valor que escribió la
// persona pasa por los saneadores de acá: dentro de un `or()` una coma, un paréntesis o una
// comilla sin escapar rompen el filtro entero (400). Sólo tipos y funciones puras: no crea
// clientes.
import type { CondicionDeAtributo } from '../filtros/campos'
import type { Cursor } from '../paginacion'

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
  // Un arreglo de la fila comparte algún elemento con estos (`&&`).
  overlaps: (columna: string, valores: readonly string[]) => Consulta
  or: (filtros: string) => Consulta
}

type Rango = {
  columna: string
  desde: string | number | null
  hasta: string | number | null
  // «Antes de» en vez de «hasta e inclusive».
  hastaExclusivo?: boolean
}

// Sólo los bordes que hay.
export function aplicarRango<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  pedido: Rango,
): Consulta {
  const { columna, desde, hasta, hastaExclusivo = false } = pedido
  const conDesde = desde === null ? consulta : consulta.gte(columna, desde)
  if (hasta === null) {
    return conDesde
  }
  return hastaExclusivo ? conDesde.lt(columna, hasta) : conDesde.lte(columna, hasta)
}

function atributosContienen<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  columna: string,
  alternativas: readonly Record<string, unknown>[],
): Consulta {
  const [unica, ...resto] = alternativas
  if (!unica) {
    return consulta
  }
  return resto.length === 0
    ? consulta.contains(columna, unica)
    : consulta.or(
        alternativas.map((una) => `${columna}.cs.${citar(JSON.stringify(una))}`).join(','),
      )
}

// Una condición sobre los atributos. La clave del atributo viene del layout, nunca de la URL. `columna` es la columna
// jsonb (`atributos` por omisión; los leads filtran un campo público por `atributos_publicos`, 9h), nunca de la URL.
export function aplicarCondicionDeAtributo<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condicion: CondicionDeAtributo,
  columna = 'atributos',
): Consulta {
  switch (condicion.tipo) {
    case 'atributos_contienen':
      return atributosContienen(consulta, columna, condicion.alternativas)
    case 'atributo_rango_numero':
      // `->`: compara como jsonb, que entre números es numérico.
      return aplicarRango(consulta, {
        columna: `${columna}->${condicion.clave}`,
        desde: condicion.min,
        hasta: condicion.max,
      })
    case 'atributo_rango_texto':
      return aplicarRango(consulta, {
        columna: `${columna}->>${condicion.clave}`,
        desde: condicion.desde,
        hasta: condicion.antesDe,
        hastaExclusivo: true,
      })
    case 'atributo_texto':
      return consulta.ilike(`${columna}->>${condicion.clave}`, patronContiene(condicion.texto))
  }
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
