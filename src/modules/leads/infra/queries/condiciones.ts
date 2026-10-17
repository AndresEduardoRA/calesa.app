// Traduce las condiciones del listado de leads a filtros de PostgREST sobre `leads_vista`. Lo que
// sale del layout (`atributos`) y los saneadores son de `@/shared/lib/supabase/consultas`. Todo
// texto que escribió la persona entra a un `or()` por `citar()` y `patronContiene()`.
import {
  aplicarCondicionDeAtributo,
  citar,
  patronContiene,
  type Filtrable,
} from '@/shared/lib/supabase/consultas'
import type { CondicionDeLead } from '../../entities/filtros'

// Un id que ninguna fila tiene: con él un filtro no devuelve nada.
const ID_QUE_NO_EXISTE = '00000000-0000-0000-0000-000000000000'

// Por nombre y por número de lead. Nunca por teléfono: buscar dígitos sobre lo ajeno sería un oráculo. El número ya
// viene resuelto a ids (de la copia que corresponde, con su índice): acá es un `id in`.
function aplicarBusqueda<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condicion: Extract<CondicionDeLead, { tipo: 'busqueda' }>,
): Consulta {
  const porId =
    condicion.idsDelNumero.length > 0 ? `id.in.(${condicion.idsDelNumero.join(',')})` : null
  if (condicion.soloNumero) {
    // «#124»: sólo ese lead; si no hay, ninguno.
    return porId === null ? consulta.in('id', [ID_QUE_NO_EXISTE]) : consulta.or(porId)
  }
  const porNombre = `nombre.ilike.${citar(patronContiene(condicion.texto))}`
  return consulta.or(porId === null ? porNombre : `${porNombre},${porId}`)
}

function aplicarUna<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condicion: CondicionDeLead,
): Consulta {
  switch (condicion.tipo) {
    case 'busqueda':
      return aplicarBusqueda(consulta, condicion)
    case 'columna_en':
      return consulta.in(condicion.columna, condicion.valores)
    case 'en_cartera':
      return consulta.eq('en_cartera', true)
    // Las marcas de quien mira: columnas de `leads_vista` ya recortadas a sus marcas.
    case 'tachado':
      return consulta.eq('esta_tachado', condicion.valor)
    case 'favorito':
      return consulta.eq('es_favorito', condicion.valor)
    case 'etiquetas':
      return consulta.overlaps('etiquetas', condicion.ids)
    case 'atributos_contienen':
    case 'atributo_rango_numero':
    case 'atributo_rango_texto':
    case 'atributo_texto':
      return aplicarCondicionDeAtributo(consulta, condicion)
  }
}

export function aplicarCondicionesDeLeads<Consulta extends Filtrable<Consulta>>(
  consulta: Consulta,
  condiciones: readonly CondicionDeLead[],
): Consulta {
  return condiciones.reduce((parcial, condicion) => aplicarUna(parcial, condicion), consulta)
}
